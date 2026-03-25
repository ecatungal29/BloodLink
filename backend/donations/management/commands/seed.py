"""
Management command to seed BloodLink with realistic test data.

Usage:
    python manage.py seed            # seed everything
    python manage.py seed --flush    # drop all data first, then seed
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random

from donations.models import Hospital, BloodInventory, BloodRequest, RequestResponse

User = get_user_model()

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

HOSPITALS = [
    {
        "name": "Philippine General Hospital",
        "address": "Taft Avenue, Ermita",
        "city": "Manila",
        "contact_number": "+63 2 8554-8400",
        "blood_bank_license_number": "BBL-2024-001",
        "latitude": 14.5793,
        "longitude": 120.9836,
    },
    {
        "name": "St. Luke's Medical Center",
        "address": "279 E. Rodriguez Sr. Blvd",
        "city": "Quezon City",
        "contact_number": "+63 2 8723-0101",
        "blood_bank_license_number": "BBL-2024-002",
        "latitude": 14.6220,
        "longitude": 121.0231,
    },
    {
        "name": "Makati Medical Center",
        "address": "2 Amorsolo St., Legaspi Village",
        "city": "Makati",
        "contact_number": "+63 2 8888-8999",
        "blood_bank_license_number": "BBL-2024-003",
        "latitude": 14.5547,
        "longitude": 121.0244,
    },
    {
        "name": "The Medical City",
        "address": "Ortigas Avenue, Pasig",
        "city": "Pasig",
        "contact_number": "+63 2 8988-1000",
        "blood_bank_license_number": "BBL-2024-004",
        "latitude": 14.5856,
        "longitude": 121.0614,
    },
    {
        "name": "National Kidney and Transplant Institute",
        "address": "East Avenue, Diliman",
        "city": "Quezon City",
        "contact_number": "+63 2 8981-0300",
        "blood_bank_license_number": "BBL-2024-005",
        "latitude": 14.6478,
        "longitude": 121.0457,
    },
]

USERS = [
    # super_admin — no hospital
    {
        "email": "admin@bloodlink.ph",
        "first_name": "System",
        "last_name": "Admin",
        "role": "super_admin",
        "hospital_index": None,
        "password": "Admin@12345",
    },
    # hospital_admin per hospital
    {
        "email": "admin.pgh@bloodlink.ph",
        "first_name": "Maria",
        "last_name": "Santos",
        "role": "hospital_admin",
        "hospital_index": 0,
        "password": "Admin@12345",
    },
    {
        "email": "admin.stlukes@bloodlink.ph",
        "first_name": "Jose",
        "last_name": "Reyes",
        "role": "hospital_admin",
        "hospital_index": 1,
        "password": "Admin@12345",
    },
    {
        "email": "admin.mmc@bloodlink.ph",
        "first_name": "Ana",
        "last_name": "Cruz",
        "role": "hospital_admin",
        "hospital_index": 2,
        "password": "Admin@12345",
    },
    # staff
    {
        "email": "staff.pgh@bloodlink.ph",
        "first_name": "Carlos",
        "last_name": "Dela Cruz",
        "role": "staff",
        "hospital_index": 0,
        "password": "Staff@12345",
    },
    {
        "email": "staff.tmc@bloodlink.ph",
        "first_name": "Lena",
        "last_name": "Gomez",
        "role": "staff",
        "hospital_index": 3,
        "password": "Staff@12345",
    },
    # viewer
    {
        "email": "viewer@bloodlink.ph",
        "first_name": "Viewer",
        "last_name": "Account",
        "role": "viewer",
        "hospital_index": 4,
        "password": "Viewer@12345",
    },
]

# units_available per (component, abo, rh) — realistic spread
# Negative blood types are rarer in the Philippine population (~5-8% Rh-negative)
# so they intentionally carry lower baseline units than their positive counterparts.
INVENTORY_TEMPLATE = [
    # RBC — most critical component, all 8 blood types
    ("RBC", "O",  "-",  2),   # Universal donor — critical, always low
    ("RBC", "O",  "+", 18),   # Most common Filipino blood type
    ("RBC", "A",  "-",  4),
    ("RBC", "A",  "+", 22),
    ("RBC", "B",  "-",  3),
    ("RBC", "B",  "+", 15),
    ("RBC", "AB", "-",  1),   # Rarest — chronic shortage
    ("RBC", "AB", "+",  9),
    # Platelets — all 8 blood types
    # Platelets have a 5-7 day shelf life so units are naturally lower
    ("Platelets", "O",  "-",  2),
    ("Platelets", "O",  "+", 12),
    ("Platelets", "A",  "-",  3),
    ("Platelets", "A",  "+",  8),
    ("Platelets", "B",  "-",  1),
    ("Platelets", "B",  "+",  5),
    ("Platelets", "AB", "-",  0),
    ("Platelets", "AB", "+",  2),
    # Plasma — all 8 blood types
    # Plasma is ABO-compatible in reverse (AB plasma is universal donor)
    # and can be frozen, so units tend to be higher
    ("Plasma", "O",  "-",  8),
    ("Plasma", "O",  "+", 20),
    ("Plasma", "A",  "-",  6),
    ("Plasma", "A",  "+", 14),
    ("Plasma", "B",  "-",  4),
    ("Plasma", "B",  "+", 10),
    ("Plasma", "AB", "-",  3),
    ("Plasma", "AB", "+",  6),
]

BLOOD_REQUESTS = [
    {
        "hospital_index": 0,        # PGH requesting
        "component_type": "RBC",
        "abo_type": "O",
        "rh_type": "-",
        "units_needed": 4,
        "urgency_level": "emergency",
        "status": "open",
        "notes": "Trauma patient post-MVA, universal donor needed.",
        "days_ago": 0,
    },
    {
        "hospital_index": 2,        # MMC requesting
        "component_type": "Platelets",
        "abo_type": "A",
        "rh_type": "+",
        "units_needed": 6,
        "urgency_level": "urgent",
        "status": "open",
        "notes": "Oncology patient, low platelet count pre-chemo.",
        "days_ago": 1,
    },
    {
        "hospital_index": 3,        # TMC requesting
        "component_type": "Plasma",
        "abo_type": "AB",
        "rh_type": "+",
        "units_needed": 3,
        "urgency_level": "routine",
        "status": "open",
        "notes": "Elective surgery scheduled in 3 days.",
        "days_ago": 2,
    },
    {
        "hospital_index": 1,        # St. Luke's requesting
        "component_type": "RBC",
        "abo_type": "B",
        "rh_type": "-",
        "units_needed": 2,
        "urgency_level": "urgent",
        "status": "fulfilled",
        "notes": "Surgical patient — fulfilled by NKTI.",
        "days_ago": 5,
    },
    {
        "hospital_index": 4,        # NKTI requesting
        "component_type": "RBC",
        "abo_type": "A",
        "rh_type": "+",
        "units_needed": 5,
        "urgency_level": "routine",
        "status": "closed",
        "notes": "Dialysis patient — closed, sourced externally.",
        "days_ago": 10,
    },
]


class Command(BaseCommand):
    help = "Seed the database with test hospitals, users, inventory, and blood requests."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing seed data before seeding.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write("Flushing existing data...")
            AuditLog_model = None
            try:
                from donations.models import AuditLog
                AuditLog.objects.all().delete()
            except Exception:
                pass
            RequestResponse.objects.all().delete()
            BloodRequest.objects.all().delete()
            BloodInventory.objects.all().delete()
            Hospital.objects.all().delete()
            User.objects.filter(email__endswith="@bloodlink.ph").delete()
            self.stdout.write(self.style.WARNING("  Flushed."))

        # 1. Hospitals
        self.stdout.write("\nSeeding hospitals...")
        hospitals = []
        for data in HOSPITALS:
            h, created = Hospital.objects.get_or_create(
                blood_bank_license_number=data["blood_bank_license_number"],
                defaults=data,
            )
            hospitals.append(h)
            self.stdout.write(f"  {'Created' if created else 'Exists '} → {h.name}")

        # 2. Users
        self.stdout.write("\nSeeding users...")
        users_by_hospital = {}   # hospital_index → list of User
        created_users = []
        for u in USERS:
            hospital = hospitals[u["hospital_index"]] if u["hospital_index"] is not None else None
            user, created = User.objects.get_or_create(
                email=u["email"],
                defaults={
                    "username": u["email"].split("@")[0],
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "role": u["role"],
                    "hospital": hospital,
                    "is_verified": True,
                },
            )
            if created:
                user.set_password(u["password"])
                user.save()
            created_users.append(user)
            idx = u["hospital_index"]
            if idx is not None:
                users_by_hospital.setdefault(idx, []).append(user)
            self.stdout.write(
                f"  {'Created' if created else 'Exists '} → {user.email} [{user.role}]"
            )

        # 3. Blood inventory — vary units slightly per hospital
        self.stdout.write("\nSeeding blood inventory...")
        count = 0
        for hospital_idx, hospital in enumerate(hospitals):
            for component, abo, rh, base_units in INVENTORY_TEMPLATE:
                # Add random variance per hospital
                variance = random.randint(-2, 4)
                units = max(0, base_units + variance)
                inv, created = BloodInventory.objects.get_or_create(
                    hospital=hospital,
                    component_type=component,
                    abo_type=abo,
                    rh_type=rh,
                    defaults={"units_available": units},
                )
                if not created:
                    # Update existing with fresh units
                    inv.units_available = units
                    inv.save()
                count += 1
        self.stdout.write(f"  Seeded {count} inventory records across {len(hospitals)} hospitals.")

        # 4. Blood requests
        self.stdout.write("\nSeeding blood requests...")
        super_admin = User.objects.filter(role="super_admin").first()
        for req_data in BLOOD_REQUESTS:
            h_idx = req_data["hospital_index"]
            hospital = hospitals[h_idx]
            created_by = users_by_hospital.get(h_idx, [super_admin])[0]
            req_ts = timezone.now() - timedelta(days=req_data["days_ago"])

            # Check if an identical open request already exists
            exists = BloodRequest.objects.filter(
                requesting_hospital=hospital,
                component_type=req_data["component_type"],
                abo_type=req_data["abo_type"],
                rh_type=req_data["rh_type"],
                status=req_data["status"],
            ).exists()

            if not exists:
                br = BloodRequest.objects.create(
                    requesting_hospital=hospital,
                    component_type=req_data["component_type"],
                    abo_type=req_data["abo_type"],
                    rh_type=req_data["rh_type"],
                    units_needed=req_data["units_needed"],
                    urgency_level=req_data["urgency_level"],
                    status=req_data["status"],
                    notes=req_data["notes"],
                    created_by=created_by,
                )
                # Backdate created_at
                BloodRequest.objects.filter(pk=br.pk).update(created_at=req_ts)
                self.stdout.write(
                    f"  Created → {hospital.name} [{req_data['urgency_level'].upper()}] "
                    f"{req_data['component_type']} {req_data['abo_type']}{req_data['rh_type']}"
                )
            else:
                self.stdout.write(f"  Exists  → {hospital.name} {req_data['component_type']} {req_data['abo_type']}{req_data['rh_type']}")

        # 5. Summary
        self.stdout.write("\n" + "─" * 50)
        self.stdout.write(self.style.SUCCESS("Seed complete!"))
        self.stdout.write(f"  Hospitals  : {Hospital.objects.count()}")
        self.stdout.write(f"  Users      : {User.objects.count()}")
        self.stdout.write(f"  Inventory  : {BloodInventory.objects.count()} records")
        self.stdout.write(f"  Requests   : {BloodRequest.objects.count()}")
        self.stdout.write("\nTest accounts (password shown):")
        for u in USERS:
            self.stdout.write(f"  {u['role']:15} {u['email']:40} {u['password']}")
