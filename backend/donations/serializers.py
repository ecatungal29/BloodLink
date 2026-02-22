from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import BloodRequest, Donation, BloodInventory, DonationCenter

User = get_user_model()


class BloodRequestSerializer(serializers.ModelSerializer):
    requester = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = BloodRequest
        fields = ['id', 'requester', 'blood_type', 'units_needed', 'urgency_level', 
                 'hospital_name', 'hospital_address', 'patient_name', 'patient_age', 
                 'medical_reason', 'contact_person', 'contact_phone', 'status', 
                 'created_at', 'updated_at', 'required_date']
        read_only_fields = ['id', 'requester', 'status', 'created_at', 'updated_at']


class DonationSerializer(serializers.ModelSerializer):
    donor = serializers.StringRelatedField(read_only=True)
    blood_request = BloodRequestSerializer(read_only=True)
    
    class Meta:
        model = Donation
        fields = ['id', 'donor', 'blood_request', 'donation_date', 'location', 
                 'status', 'units_donated', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'donor', 'created_at', 'updated_at']


class BloodInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodInventory
        fields = ['id', 'blood_type', 'units_available', 'last_updated', 'location']
        read_only_fields = ['id', 'last_updated']


class DonationCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationCenter
        fields = ['id', 'name', 'address', 'phone', 'email', 'operating_hours', 
                 'services_offered', 'latitude', 'longitude', 'is_active', 
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DonorMatchSerializer(serializers.ModelSerializer):
    """Serializer for matching donors with blood requests"""
    distance = serializers.SerializerMethodField()
    last_donation_date = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 
                 'blood_type', 'distance', 'last_donation_date']
    
    def get_distance(self, obj):
        # This would typically calculate actual distance based on location
        # For now, returning a placeholder
        return "N/A"
    
    def get_last_donation_date(self, obj):
        try:
            return obj.donor_profile.last_donation_date
        except:
            return None
