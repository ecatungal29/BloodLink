from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
import requests
from .models import DonorProfile
from .serializers import (
    UserRegistrationSerializer, UserSerializer,
    DonorProfileSerializer, LoginSerializer
)

User = get_user_model()


class RegisterViewSet(viewsets.ModelViewSet):
    """ViewSet for user registration"""
    queryset = User.objects.all()
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
    """API endpoint for user login"""
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
    """API endpoint for Google OAuth sign-in / sign-up"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({'error': 'access_token is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify the token and fetch user info from Google
        try:
            google_response = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
        except requests.RequestException:
            return Response({'error': 'Could not connect to Google'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if google_response.status_code != 200:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_401_UNAUTHORIZED)

        google_data = google_response.json()
        email = google_data.get('email')
        if not email:
            return Response({'error': 'Google account has no email'}, status=status.HTTP_400_BAD_REQUEST)

        if not google_data.get('email_verified', False):
            return Response({'error': 'Google email is not verified'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create the user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': _unique_username(email),
                'first_name': google_data.get('given_name', ''),
                'last_name': google_data.get('family_name', ''),
                'is_verified': True,
            }
        )

        if created:
            user.set_unusable_password()
            user.save()
            if user.user_type == 'donor':
                DonorProfile.objects.create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


def _unique_username(email):
    """Derive a unique username from an email address."""
    base = email.split('@')[0]
    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f'{base}{counter}'
        counter += 1
    return username


class LogoutView(APIView):
    """API endpoint for user logout"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


class RefreshTokenView(APIView):
    """API endpoint to refresh JWT token"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            refresh = RefreshToken(request.data["refresh"])
            return Response({
                'access': str(refresh.access_token),
            })
        except Exception as e:
            return Response({"error": "Invalid refresh token"}, status=status.HTTP_400_BAD_REQUEST)


class ProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for user profiles"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)
    
    def get_object(self):
        return self.request.user
    
    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """Get or update current user profile"""
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def donor_profile(self, request):
        """Get donor profile if user is a donor"""
        if request.user.user_type != 'donor':
            return Response({"error": "User is not a donor"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            donor_profile = request.user.donor_profile
            serializer = DonorProfileSerializer(donor_profile)
            return Response(serializer.data)
        except DonorProfile.DoesNotExist:
            return Response({"error": "Donor profile not found"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['patch'])
    def update_donor_profile(self, request):
        """Update donor profile"""
        if request.user.user_type != 'donor':
            return Response({"error": "User is not a donor"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            donor_profile = request.user.donor_profile
            serializer = DonorProfileSerializer(donor_profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except DonorProfile.DoesNotExist:
            return Response({"error": "Donor profile not found"}, status=status.HTTP_404_NOT_FOUND)
