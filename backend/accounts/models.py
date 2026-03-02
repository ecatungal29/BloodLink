from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model for BloodLink internal hospital portal."""

    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('hospital_admin', 'Hospital Admin'),
        ('staff', 'Staff'),
        ('viewer', 'Viewer'),
    ]

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='viewer')
    hospital = models.ForeignKey(
        'donations.Hospital',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff',
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_super_admin(self):
        return self.role == 'super_admin'

    @property
    def is_hospital_admin(self):
        return self.role == 'hospital_admin'

    @property
    def can_edit(self):
        """Staff and above can make changes."""
        return self.role in ('super_admin', 'hospital_admin', 'staff')
