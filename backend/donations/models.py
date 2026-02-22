from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class BloodRequest(models.Model):
    """Blood donation requests from recipients/hospitals"""
    URGENCY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('matched', 'Matched'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blood_requests')
    blood_type = models.CharField(max_length=3)
    units_needed = models.PositiveIntegerField()
    urgency_level = models.CharField(max_length=10, choices=URGENCY_LEVELS, default='medium')
    hospital_name = models.CharField(max_length=200)
    hospital_address = models.TextField()
    patient_name = models.CharField(max_length=100)
    patient_age = models.PositiveIntegerField()
    medical_reason = models.TextField()
    contact_person = models.CharField(max_length=100)
    contact_phone = models.CharField(max_length=20)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    required_date = models.DateField()
    
    def __str__(self):
        return f"{self.blood_type} - {self.units_needed} units for {self.patient_name}"


class Donation(models.Model):
    """Record of blood donations"""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    donor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='donations')
    blood_request = models.ForeignKey(BloodRequest, on_delete=models.CASCADE, related_name='donations', null=True, blank=True)
    donation_date = models.DateTimeField()
    location = models.CharField(max_length=200)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='scheduled')
    units_donated = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Donation by {self.donor.email} on {self.donation_date}"


class BloodInventory(models.Model):
    """Blood bank inventory tracking"""
    blood_type = models.CharField(max_length=3, unique=True)
    units_available = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    location = models.CharField(max_length=200, default='Main Blood Bank')
    
    def __str__(self):
        return f"{self.blood_type}: {self.units_available} units"


class DonationCenter(models.Model):
    """Blood donation centers/hospitals"""
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    operating_hours = models.TextField()
    services_offered = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
