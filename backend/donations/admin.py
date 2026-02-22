from django.contrib import admin
from .models import BloodRequest, Donation, BloodInventory, DonationCenter


@admin.register(BloodRequest)
class BloodRequestAdmin(admin.ModelAdmin):
    list_display = ['patient_name', 'blood_type', 'units_needed', 'urgency_level', 'status', 'requester']
    list_filter = ['blood_type', 'urgency_level', 'status', 'created_at']
    search_fields = ['patient_name', 'hospital_name', 'requester__email']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ['donor', 'donation_date', 'location', 'status', 'units_donated']
    list_filter = ['status', 'donation_date', 'location']
    search_fields = ['donor__email', 'location']
    ordering = ['-donation_date']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(BloodInventory)
class BloodInventoryAdmin(admin.ModelAdmin):
    list_display = ['blood_type', 'units_available', 'location', 'last_updated']
    list_filter = ['blood_type', 'location']
    search_fields = ['blood_type', 'location']
    readonly_fields = ['last_updated']


@admin.register(DonationCenter)
class DonationCenterAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'address']
    readonly_fields = ['created_at', 'updated_at']
