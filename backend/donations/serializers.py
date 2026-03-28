from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Hospital, BloodInventory, BloodRequest, RequestResponse, AuditLog

User = get_user_model()


class HospitalSerializer(serializers.ModelSerializer):
    inventory_count = serializers.SerializerMethodField()
    is_stale = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'address', 'city', 'contact_number',
            'blood_bank_license_number', 'latitude', 'longitude',
            'last_inventory_update', 'is_active', 'inventory_count',
            'is_stale', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'last_inventory_update', 'created_at', 'updated_at']

    def get_inventory_count(self, obj):
        return obj.inventory.count()

    def get_is_stale(self, obj):
        """True if inventory hasn't been updated in 24 hours."""
        from django.utils import timezone
        from datetime import timedelta
        if not obj.last_inventory_update:
            return True
        return obj.last_inventory_update < timezone.now() - timedelta(hours=24)


class BloodInventorySerializer(serializers.ModelSerializer):
    hospital_name = serializers.SerializerMethodField()
    blood_label = serializers.SerializerMethodField()

    class Meta:
        model = BloodInventory
        fields = [
            'id', 'hospital', 'hospital_name', 'component_type',
            'abo_type', 'rh_type', 'blood_label', 'units_available',
            'availability_status', 'last_updated', 'created_at',
        ]
        read_only_fields = ['id', 'availability_status', 'last_updated', 'created_at']

    def get_hospital_name(self, obj):
        return obj.hospital.name

    def get_blood_label(self, obj):
        return obj.blood_label


class BloodRequestSerializer(serializers.ModelSerializer):
    requesting_hospital_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    blood_label = serializers.SerializerMethodField()
    response_count = serializers.SerializerMethodField()

    class Meta:
        model = BloodRequest
        fields = [
            'id', 'requesting_hospital', 'requesting_hospital_name',
            'component_type', 'abo_type', 'rh_type', 'blood_label',
            'units_needed', 'urgency_level', 'status', 'notes',
            'created_by', 'created_by_name', 'response_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_requesting_hospital_name(self, obj):
        return obj.requesting_hospital.name

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return None

    def get_blood_label(self, obj):
        return obj.blood_label

    def get_response_count(self, obj):
        return obj.responses.count()


class RequestResponseSerializer(serializers.ModelSerializer):
    responding_hospital_name = serializers.SerializerMethodField()
    responded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RequestResponse
        fields = [
            'id', 'request', 'responding_hospital', 'responding_hospital_name',
            'response_status', 'message', 'responded_by', 'responded_by_name',
            'timestamp',
        ]
        read_only_fields = ['id', 'responding_hospital', 'responded_by', 'timestamp']

    def get_responding_hospital_name(self, obj):
        return obj.responding_hospital.name

    def get_responded_by_name(self, obj):
        if obj.responded_by:
            return f"{obj.responded_by.first_name} {obj.responded_by.last_name}".strip()
        return None


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action_type', 'entity_type',
            'entity_id', 'ip_address', 'metadata', 'timestamp',
        ]
        read_only_fields = fields

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None


# Lightweight serializer for search results — includes geo distance
class HospitalSearchResultSerializer(serializers.ModelSerializer):
    distance_km = serializers.FloatField(read_only=True, default=None)
    matched_inventory = serializers.SerializerMethodField()
    is_stale = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'address', 'city', 'contact_number',
            'latitude', 'longitude', 'last_inventory_update',
            'distance_km', 'matched_inventory', 'is_stale',
        ]

    def get_matched_inventory(self, obj):
        # Injected by the view via context
        inv = self.context.get('matched_inventory', {}).get(obj.id)
        if inv:
            return BloodInventorySerializer(inv).data
        return None

    def get_is_stale(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        if not obj.last_inventory_update:
            return True
        return obj.last_inventory_update < timezone.now() - timedelta(hours=24)
