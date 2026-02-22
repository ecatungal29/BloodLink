from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model for BloodLink"""
    BLOOD_TYPE_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    
    USER_TYPE_CHOICES = [
        ('donor', 'Donor'),
        ('recipient', 'Recipient'),
        ('hospital', 'Hospital'),
        ('blood_bank', 'Blood Bank'),
    ]
    
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    blood_type = models.CharField(max_length=3, choices=BLOOD_TYPE_CHOICES, blank=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='donor')
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return f"{self.email} ({self.user_type})"


class DonorProfile(models.Model):
    """Extended profile for blood donors"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='donor_profile')
    last_donation_date = models.DateField(null=True, blank=True)
    donation_count = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    medical_conditions = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
    
    def __str__(self):
        return f"Donor profile for {self.user.email}"
