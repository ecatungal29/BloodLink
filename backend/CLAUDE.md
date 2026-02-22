# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Activate virtual environment (Windows)
venv\Scripts\activate

# Run development server
python manage.py runserver

# Database migrations
python manage.py makemigrations
python manage.py migrate

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

Required env vars: `SECRET_KEY`, `DEBUG`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`

## Architecture

Two Django apps under `bloodlink/` (the project config directory):

**`accounts/`** — User management
- Custom `User` model extending `AbstractUser` with `email` as `USERNAME_FIELD`. Users authenticate by email, not username.
- `user_type` field controls data access: `donor`, `recipient`, `hospital`, `blood_bank`
- `DonorProfile` extends donors via OneToOne (accessed as `user.donor_profile`)
- Views: `RegisterViewSet`, `LoginView`, `LogoutView`, `RefreshTokenView`, `ProfileViewSet`

**`donations/`** — Blood management
- `BloodRequest` — requests from recipients/hospitals with urgency levels and status tracking
- `Donation` — links a donor to an optional `BloodRequest`, tracks scheduled/completed donations
- `BloodInventory` — one record per blood type tracking available units
- `DonationCenter` — physical locations with geolocation data
- `SearchDonorsView` / `MatchDonorsView` — implement blood-type compatibility logic (compatibility map defined inline in both views — same logic duplicated in two places)

**URL structure:**
- `/api/auth/` → accounts app
- `/api/donations/` → donations app

**Authentication:** JWT via `djangorestframework-simplejwt`. Access tokens expire in 60 minutes, refresh tokens in 1 day with rotation enabled. Default DRF permission is `IsAuthenticated` — public endpoints explicitly set `AllowAny`.

**Data access pattern:** ViewSet `get_queryset()` filters by `user_type` to enforce data isolation — hospitals/blood_banks typically see all records, donors see only their own.

**Pagination:** Default page size 20 via `PageNumberPagination`.

**CORS:** Configured for `localhost:3000` (frontend).

## Key Design Decisions

- Migrations are in a top-level `migrations/` directory (not inside each app), which is non-standard Django layout.
- Blood type compatibility logic is duplicated between `SearchDonorsView` and `MatchDonorsView` in `donations/views.py`.
- `BloodInventory` uses `blood_type` as a unique field — one inventory record per blood type globally (not per location despite having a `location` field).
- `rest_framework_simplejwt.token_blacklist` is in `INSTALLED_APPS` to support the `LogoutView`'s `token.blacklist()` call.
