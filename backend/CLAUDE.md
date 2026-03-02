# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Activate virtual environment (Windows)
venv\Scripts\activate

# Run development server
python manage.py runserver

# Database migrations
python manage.py makemigrations accounts donations
python manage.py migrate

# Seed test data (hospitals, users, inventory, requests)
python manage.py seed

# Re-seed from scratch (wipes existing seed data first)
python manage.py seed --flush

# Run all tests
python manage.py test

# Run tests for a specific app
python manage.py test accounts
python manage.py test donations

# Run a specific test class or method
python manage.py test accounts.tests.TestClassName
python manage.py test accounts.tests.TestClassName.test_method_name

# Django shell
python manage.py shell

# Create superuser
python manage.py createsuperuser
```

## Environment Configuration

The `.env` file contains a single word (environment name) that determines which env file to load:
- `local` → `.local.env`
- `development` → `.development.env`
- `staging` → `.staging.env`
- `production` → `.production.env`

Currently set to `local`. The `.local.env` file holds the actual secrets (DB credentials, SECRET_KEY, DEBUG flag).

Required env vars: `SECRET_KEY`, `DEBUG`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `GOOGLE_CLIENT_ID`

## Architecture

Two Django apps under `bloodlink/` (the project config directory):

**`accounts/`** — User management & authentication
- Custom `User` model extending `AbstractUser` with `email` as `USERNAME_FIELD`. Users authenticate by email, not username.
- `role` field controls access: `super_admin`, `hospital_admin`, `staff`, `viewer`
- `hospital` FK links every user (except `super_admin`) to a `Hospital` in the `donations` app
- `username` is auto-generated from the email prefix on registration (never exposed in the UI)
- Custom permission classes in `accounts/permissions.py`: `IsSuperAdmin`, `IsHospitalAdmin`, `IsStaffOrAbove`, `BelongsToHospital`
- Views: `RegisterView` (CreateAPIView), `LoginView`, `GoogleLoginView`, `LogoutView`, `RefreshTokenView`, `ProfileViewSet`, `UserManagementViewSet`

**`donations/`** — Hospital coordination & blood management
- `Hospital` — participating facilities with lat/lon for geo-sorting; `last_inventory_update` drives staleness detection
- `BloodInventory` — one record per `(hospital, component_type, abo_type, rh_type)`; `availability_status` is auto-computed on every `save()` based on unit thresholds (≤0 → none, ≤3 → critical, ≤10 → low, >10 → adequate); saving also updates `hospital.last_inventory_update`
- `BloodRequest` — inter-hospital request (not patient-centric); statuses: `open`, `fulfilled`, `closed`; urgency levels: `routine`, `urgent`, `emergency`
- `RequestResponse` — a hospital's reply to a `BloodRequest`; unique per `(request, responding_hospital)`; response statuses: `available`, `limited`, `not_available`
- `AuditLog` — immutable log of all write actions; written via `donations/utils.py:log_action()`
- `SearchHospitalsView` — searches `BloodInventory` by `(component_type, abo_type, rh_type)`, returns matching hospitals sorted by Haversine distance when `lat`/`lon` params are provided
- Seed command: `donations/management/commands/seed.py`

**URL structure:**
- `/api/auth/` → accounts app
- `/api/donations/` → donations app

**Full endpoint map:**

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/auth/register/` | AllowAny | Register new user |
| POST | `/api/auth/login/` | AllowAny | Email/password login |
| POST | `/api/auth/google/` | AllowAny | Google OAuth login |
| POST | `/api/auth/logout/` | IsAuthenticated | Blacklist refresh token |
| POST | `/api/auth/refresh/` | AllowAny | Get new access token |
| GET/PATCH | `/api/auth/profile/me/` | IsAuthenticated | Own profile |
| GET/POST/PATCH/DELETE | `/api/auth/users/` | IsSuperAdmin | Manage all users |
| GET/POST | `/api/donations/hospitals/` | GET: Any auth / POST: IsSuperAdmin | List or create hospitals |
| GET/POST | `/api/donations/inventory/` | GET: Any auth / Write: IsStaffOrAbove | Blood inventory |
| GET/POST | `/api/donations/requests/` | GET: Any auth / Write: IsStaffOrAbove | Blood requests |
| PATCH | `/api/donations/requests/{id}/fulfill/` | IsStaffOrAbove | Mark request fulfilled |
| PATCH | `/api/donations/requests/{id}/close/` | IsStaffOrAbove | Close a request |
| GET/POST | `/api/donations/responses/` | IsStaffOrAbove | Request responses |
| GET | `/api/donations/search/` | IsAuthenticated | Search hospitals by inventory + geo |
| GET | `/api/donations/audit/` | IsSuperAdmin | Read-only audit log |

**Authentication:** JWT via `djangorestframework-simplejwt`. Access tokens expire in 60 minutes, refresh tokens in 1 day with rotation enabled. Logout blacklists the refresh token. Default DRF permission is `IsAuthenticated`.

**Data scoping:** Non-`super_admin` users are scoped to their own hospital in `get_queryset()`. `super_admin` sees all data across all hospitals.

**Pagination:** Default page size 20 via `PageNumberPagination`.

**CORS:** Configured for `localhost:3000` (frontend dev server).

**Utility module:** `donations/utils.py` contains:
- `haversine_km(lat1, lon1, lat2, lon2)` — Haversine distance in km
- `log_action(user, action_type, entity_type, entity_id, request, metadata)` — writes an `AuditLog` entry
- `get_client_ip(request)` — extracts real IP respecting `X-Forwarded-For`
- `BLOOD_TYPE_COMPATIBILITY` — single source of truth for donor compatibility map

## Key Design Decisions

- `BloodInventory.availability_status` is **computed on save**, not stored independently — thresholds: `>10` adequate, `4-10` low, `1-3` critical, `0` none.
- `Hospital.last_inventory_update` is updated automatically whenever any of its `BloodInventory` records are saved.
- Staleness (>24 h without inventory update) is computed at serialization time in `HospitalSerializer.get_is_stale()` — no separate cron job needed.
- `RequestResponse` has a `unique_together` on `(request, responding_hospital)` — one response per hospital per request, enforced at the DB level.
- `AuditLog` is append-only by design — no update/delete views are exposed.
- `super_admin` users have `hospital = NULL` — they are system-wide operators with no hospital affiliation.
- `rest_framework_simplejwt.token_blacklist` is in `INSTALLED_APPS` to support token invalidation on logout.
- Migrations live inside each app directory (`accounts/migrations/`, `donations/migrations/`) — standard Django layout.

## Seed Test Accounts

Run `python manage.py seed` to create these accounts:

| Role | Email | Password |
|------|-------|----------|
| super_admin | admin@bloodlink.ph | Admin@12345 |
| hospital_admin | admin.pgh@bloodlink.ph | Admin@12345 |
| hospital_admin | admin.stlukes@bloodlink.ph | Admin@12345 |
| hospital_admin | admin.mmc@bloodlink.ph | Admin@12345 |
| staff | staff.pgh@bloodlink.ph | Staff@12345 |
| staff | staff.tmc@bloodlink.ph | Staff@12345 |
| viewer | viewer@bloodlink.ph | Viewer@12345 |
