from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import BloodRequest, Donation, BloodInventory, DonationCenter
from .serializers import (
    BloodRequestSerializer, DonationSerializer, 
    BloodInventorySerializer, DonationCenterSerializer,
    DonorMatchSerializer
)

User = get_user_model()


class BloodRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for blood donation requests"""
    serializer_class = BloodRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type in ['hospital', 'blood_bank']:
            return BloodRequest.objects.filter(requester=user)
        elif user.user_type == 'recipient':
            return BloodRequest.objects.filter(requester=user)
        return BloodRequest.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)
    
    @action(detail=False, methods=['get'])
    def public(self, request):
        """Get public blood requests (for donors to see)"""
        requests = BloodRequest.objects.filter(status='pending').order_by('-urgency_level', '-created_at')
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)


class DonationViewSet(viewsets.ModelViewSet):
    """ViewSet for donations"""
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'donor':
            return Donation.objects.filter(donor=user)
        elif user.user_type in ['hospital', 'blood_bank']:
            return Donation.objects.all()
        return Donation.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(donor=self.request.user)
    
    @action(detail=False, methods=['post'])
    def schedule(self, request):
        """Schedule a new donation"""
        data = request.data.copy()
        data['donor'] = request.user.id
        data['status'] = 'scheduled'
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Update donor profile
        try:
            donor_profile = request.user.donor_profile
            donor_profile.last_donation_date = serializer.instance.donation_date.date()
            donor_profile.save()
        except:
            pass
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BloodInventoryViewSet(viewsets.ModelViewSet):
    """ViewSet for blood inventory management"""
    serializer_class = BloodInventorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type in ['hospital', 'blood_bank']:
            return BloodInventory.objects.all()
        return BloodInventory.objects.filter(blood_type=user.blood_type)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get inventory summary"""
        inventory = BloodInventory.objects.all()
        serializer = self.get_serializer(inventory, many=True)
        return Response(serializer.data)


class DonationCenterViewSet(viewsets.ModelViewSet):
    """ViewSet for donation centers"""
    serializer_class = DonationCenterSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DonationCenter.objects.filter(is_active=True)


class SearchDonorsView(APIView):
    """API endpoint to search for compatible donors"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        blood_type = request.query_params.get('blood_type')
        location = request.query_params.get('location', '')
        
        if not blood_type:
            return Response({"error": "Blood type is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get compatible donors
        compatible_types = self.get_compatible_blood_types(blood_type)
        donors = User.objects.filter(
            user_type='donor',
            blood_type__in=compatible_types,
            donor_profile__is_available=True
        ).select_related('donor_profile')
        
        # Filter by location if provided
        if location:
            donors = donors.filter(address__icontains=location)
        
        serializer = DonorMatchSerializer(donors, many=True)
        return Response(serializer.data)
    
    def get_compatible_blood_types(self, blood_type):
        """Get compatible blood types for donation"""
        compatibility_map = {
            'O-': ['O-'],
            'O+': ['O-', 'O+'],
            'A-': ['O-', 'A-'],
            'A+': ['O-', 'O+', 'A-', 'A+'],
            'B-': ['O-', 'B-'],
            'B+': ['O-', 'O+', 'B-', 'B+'],
            'AB-': ['O-', 'A-', 'B-', 'AB-'],
            'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        }
        return compatibility_map.get(blood_type, [])


class MatchDonorsView(APIView):
    """API endpoint to match donors with specific blood request"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, request_id):
        try:
            blood_request = BloodRequest.objects.get(id=request_id)
        except BloodRequest.DoesNotExist:
            return Response({"error": "Blood request not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get compatible donors
        compatible_types = self.get_compatible_blood_types(blood_request.blood_type)
        donors = User.objects.filter(
            user_type='donor',
            blood_type__in=compatible_types,
            donor_profile__is_available=True
        ).select_related('donor_profile')
        
        # Filter by location if hospital address is available
        if blood_request.hospital_address:
            donors = donors.filter(address__icontains=blood_request.hospital_address.split(',')[0])
        
        serializer = DonorMatchSerializer(donors, many=True)
        return Response({
            'blood_request': BloodRequestSerializer(blood_request).data,
            'matched_donors': serializer.data
        })
    
    def get_compatible_blood_types(self, blood_type):
        """Get compatible blood types for donation"""
        compatibility_map = {
            'O-': ['O-'],
            'O+': ['O-', 'O+'],
            'A-': ['O-', 'A-'],
            'A+': ['O-', 'O+', 'A-', 'A+'],
            'B-': ['O-', 'B-'],
            'B+': ['O-', 'O+', 'B-', 'B+'],
            'AB-': ['O-', 'A-', 'B-', 'AB-'],
            'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        }
        return compatibility_map.get(blood_type, [])
