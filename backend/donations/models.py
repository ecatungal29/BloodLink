from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

COMPONENT_CHOICES = [
    ('RBC', 'Red Blood Cells'),
    ('Platelets', 'Platelets'),
    ('Plasma', 'Plasma'),
]

ABO_CHOICES = [
    ('A', 'A'),
    ('B', 'B'),
    ('AB', 'AB'),
    ('O', 'O'),
]

RH_CHOICES = [
    ('+', 'Positive'),
    ('-', 'Negative'),
]


class Hospital(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=20)
    blood_bank_license_number = models.CharField(max_length=100, unique=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_inventory_update = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class BloodInventory(models.Model):
    AVAILABILITY_STATUS_CHOICES = [
        ('adequate', 'Adequate'),
        ('low', 'Low'),
        ('critical', 'Critical'),
        ('none', 'None'),
    ]

    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='inventory')
    component_type = models.CharField(max_length=10, choices=COMPONENT_CHOICES)
    abo_type = models.CharField(max_length=2, choices=ABO_CHOICES)
    rh_type = models.CharField(max_length=1, choices=RH_CHOICES)
    units_available = models.PositiveIntegerField(default=0)
    availability_status = models.CharField(
        max_length=10, choices=AVAILABILITY_STATUS_CHOICES, default='none'
    )
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('hospital', 'component_type', 'abo_type', 'rh_type')
        indexes = [
            models.Index(fields=['component_type', 'abo_type', 'rh_type']),
            models.Index(fields=['hospital']),
        ]

    def compute_status(self):
        if self.units_available == 0:
            return 'none'
        elif self.units_available <= 3:
            return 'critical'
        elif self.units_available <= 10:
            return 'low'
        return 'adequate'

    def save(self, *args, **kwargs):
        self.availability_status = self.compute_status()
        super().save(*args, **kwargs)
        # Update parent hospital's last_inventory_update timestamp
        self.hospital.last_inventory_update = timezone.now()
        Hospital.objects.filter(pk=self.hospital_id).update(
            last_inventory_update=timezone.now()
        )

    def __str__(self):
        return f"{self.hospital.name} — {self.component_type} {self.abo_type}{self.rh_type}: {self.units_available} units"

    @property
    def blood_label(self):
        return f"{self.abo_type}{self.rh_type}"


class BloodRequest(models.Model):
    URGENCY_CHOICES = [
        ('routine', 'Routine'),
        ('urgent', 'Urgent'),
        ('emergency', 'Emergency'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('fulfilled', 'Fulfilled'),
        ('closed', 'Closed'),
    ]

    requesting_hospital = models.ForeignKey(
        Hospital, on_delete=models.CASCADE, related_name='outgoing_requests'
    )
    component_type = models.CharField(max_length=10, choices=COMPONENT_CHOICES)
    abo_type = models.CharField(max_length=2, choices=ABO_CHOICES)
    rh_type = models.CharField(max_length=1, choices=RH_CHOICES)
    units_needed = models.PositiveIntegerField()
    urgency_level = models.CharField(max_length=10, choices=URGENCY_CHOICES, default='routine')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_requests'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"{self.requesting_hospital.name} — "
            f"{self.component_type} {self.abo_type}{self.rh_type} "
            f"x{self.units_needed} [{self.urgency_level}]"
        )

    @property
    def blood_label(self):
        return f"{self.abo_type}{self.rh_type}"


class RequestResponse(models.Model):
    RESPONSE_STATUS_CHOICES = [
        ('available', 'Available'),
        ('limited', 'Limited'),
        ('not_available', 'Not Available'),
    ]

    request = models.ForeignKey(
        BloodRequest, on_delete=models.CASCADE, related_name='responses'
    )
    responding_hospital = models.ForeignKey(
        Hospital, on_delete=models.CASCADE, related_name='responses'
    )
    response_status = models.CharField(max_length=15, choices=RESPONSE_STATUS_CHOICES)
    message = models.TextField(blank=True)
    responded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='submitted_responses'
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('request', 'responding_hospital')
        ordering = ['-timestamp']

    def __str__(self):
        return (
            f"{self.responding_hospital.name} → "
            f"Request #{self.request_id}: {self.response_status}"
        )


class AuditLog(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='audit_logs'
    )
    action_type = models.CharField(max_length=50)   # e.g. "inventory_update", "request_create"
    entity_type = models.CharField(max_length=50)   # e.g. "BloodInventory", "BloodRequest"
    entity_id = models.PositiveIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.action_type} by {self.user}"
