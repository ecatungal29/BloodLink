from django.contrib import admin
from .models import Hospital, BloodInventory, BloodRequest, RequestResponse, AuditLog


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'contact_number', 'last_inventory_update', 'is_active')
    list_filter = ('is_active', 'city')
    search_fields = ('name', 'city', 'blood_bank_license_number')


@admin.register(BloodInventory)
class BloodInventoryAdmin(admin.ModelAdmin):
    list_display = ('hospital', 'component_type', 'abo_type', 'rh_type', 'units_available', 'availability_status', 'last_updated')
    list_filter = ('component_type', 'abo_type', 'rh_type', 'availability_status', 'hospital')
    search_fields = ('hospital__name',)


@admin.register(BloodRequest)
class BloodRequestAdmin(admin.ModelAdmin):
    list_display = ('requesting_hospital', 'component_type', 'abo_type', 'rh_type', 'units_needed', 'urgency_level', 'status', 'created_at')
    list_filter = ('status', 'urgency_level', 'component_type')
    search_fields = ('requesting_hospital__name',)


@admin.register(RequestResponse)
class RequestResponseAdmin(admin.ModelAdmin):
    list_display = ('request', 'responding_hospital', 'response_status', 'timestamp')
    list_filter = ('response_status',)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action_type', 'entity_type', 'entity_id', 'ip_address')
    list_filter = ('action_type', 'entity_type')
    search_fields = ('user__email',)
    readonly_fields = ('timestamp',)
