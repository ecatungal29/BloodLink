from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
import requests as http_requests

from .models import User
from .serializers import UserRegistrationSerializer, UserSerializer, UserCreateSerializer, LoginSerializer, ProfileUpdateSerializer
from .permissions import IsSuperAdmin, IsHospitalAdmin

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new hospital staff account."""
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Email + password login."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class GoogleLoginView(APIView):
    """Google OAuth sign-in / sign-up."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response(
                {'error': 'access_token is required'}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            google_response = http_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
        except http_requests.RequestException:
            return Response(
                {'error': 'Could not connect to Google.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if google_response.status_code != 200:
            return Response({'error': 'Invalid Google token.'}, status=status.HTTP_401_UNAUTHORIZED)

        google_data = google_response.json()
        email = google_data.get('email')
        if not email:
            return Response(
                {'error': 'Google account has no email.'}, status=status.HTTP_400_BAD_REQUEST
            )
        if not google_data.get('email_verified', False):
            return Response(
                {'error': 'Google email is not verified.'}, status=status.HTTP_400_BAD_REQUEST
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': _unique_username(email),
                'first_name': google_data.get('given_name', ''),
                'last_name': google_data.get('family_name', ''),
                'is_verified': True,
            },
        )
        if created:
            user.set_unusable_password()
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class LogoutView(APIView):
    """Blacklist the refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            return Response({'message': 'Successfully logged out.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class RefreshTokenView(APIView):
    """Return a new access token from a valid refresh token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            refresh = RefreshToken(request.data['refresh'])
            return Response({'access': str(refresh.access_token)})
        except Exception:
            return Response({'error': 'Invalid refresh token.'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(APIView):
    """Change the authenticated user's password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not request.user.check_password(current_password):
            return Response(
                {'current_password': ['Incorrect password.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, request.user)
        except ValidationError as exc:
            return Response(
                {'new_password': list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password updated successfully.'})


class ProfileViewSet(viewsets.GenericViewSet):
    """Current user profile endpoints."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'GET':
            return Response(self.get_serializer(request.user).data)
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class UserManagementViewSet(viewsets.ModelViewSet):
    """hospital_admin and super_admin: manage portal users."""
    serializer_class = UserSerializer
    permission_classes = [IsHospitalAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'hospital_admin':
            if user.hospital is None:
                raise PermissionDenied("Your account has no hospital assigned. Contact a super admin.")
            qs = User.objects.select_related('hospital').filter(hospital=user.hospital).order_by('email')
        else:
            qs = User.objects.select_related('hospital').order_by('email')

        hospital_id = self.request.query_params.get('hospital')
        if hospital_id:
            qs = qs.filter(hospital_id=hospital_id)
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'hospital_admin':
            serializer.validated_data['hospital'] = user.hospital
        else:
            if not serializer.validated_data.get('hospital'):
                raise DRFValidationError({'hospital': 'Hospital is required.'})
        serializer.save()


def _unique_username(email):
    base = email.split('@')[0]
    username, counter = base, 1
    while User.objects.filter(username=username).exists():
        username = f'{base}{counter}'
        counter += 1
    return username
