# BloodLink
**Regional Blood Availability Coordination System (Prototype)**

BloodLink is a secure, internal hospital web portal designed to help blood bank staff identify nearby facilities with available blood components. It eliminates the need to send patient relatives physically searching across hospitals when a required blood type is unavailable at the admitting facility.

> This system is for **internal hospital coordination only** — not public access.

---

## Problem Statement

In many regions (including the Philippines), when a hospital lacks a required blood type (e.g., 2 units of O+ RBC), patient relatives are instructed to visit other hospitals or organizations to check availability. This leads to:

- Travel delays and traffic inefficiencies
- Emotional stress on families
- Time-sensitive risk for critical patients
- No visibility into real-time availability across facilities

BloodLink solves this by enabling hospital staff to check estimated availability across participating facilities and send structured digital inquiries — before directing anyone elsewhere.

---

## Target Users

| Role | Access Level |
|------|-------------|
| Super Admin | Full system access — manages hospitals and all users |
| Hospital Admin | Manages their hospital's inventory and staff accounts |
| Staff | Updates inventory, creates and responds to blood requests |
| Viewer | Read-only access to inventory and requests |

Public users have no access to inventory data.

---

## Core Features

### Role-Based Access Control (RBAC)
Strict permission system enforced at both API and object level:
- Only `staff` and above can update inventory or create requests
- Only `hospital_admin` and above can manage user accounts
- `super_admin` has system-wide access across all hospitals
- All write actions are audit logged automatically

### Blood Inventory Dashboard
Each participating hospital maintains per-component inventory:
- **Component type:** RBC, Platelets, Plasma
- **ABO group:** A, B, AB, O
- **Rh factor:** + / −
- **Unit count** (internal, not publicly visible)
- **Auto-computed availability status:**
  - 🟢 Adequate (>10 units)
  - 🟡 Low (4–10 units)
  - 🔴 Critical (1–3 units)
  - ⚫ None (0 units)
  - ⬜ Unverified (not updated in >24 hours)

### Smart Blood Search
Staff can search for hospitals with available inventory by:
- Component type + ABO group + Rh factor
- Results are sorted by proximity (Haversine distance) when coordinates are provided
- Each result shows: hospital name, availability status, unit count, last updated time, contact number

### Digital Availability Inquiry
Instead of sending families blindly:
- Staff submits a structured blood request (component, ABO/Rh, units needed, urgency)
- The request appears on all participating hospitals' dashboards
- Responding hospitals confirm: **Available**, **Limited**, or **Not Available**
- All responses are timestamped and logged

### Data Freshness Protection
If a hospital hasn't updated its inventory within 24 hours:
- Status is marked **Unverified**
- Displayed as a visual alert in the UI

### Audit Logging
Every write action is recorded:
- Inventory updates
- Hospital and user management
- Blood request creation and status changes
- Response submissions
- Search queries

---

## Tech Stack

### Frontend
- **Next.js 15** with React 19 and TypeScript
- **Tailwind CSS** — deep crimson red (`#DC2626`) as primary accent
- **shadcn/ui** (Radix UI-based component library)
- **Framer Motion** for micro-animations
- Centralized API client at `src/api/client.ts` — auto-injects JWT Bearer token

### Backend
- **Django 4.2** + **Django REST Framework**
- **PostgreSQL**
- **JWT authentication** via `djangorestframework-simplejwt` (60-min access tokens, 1-day refresh with rotation + blacklist on logout)
- **Google OAuth** support via token verification against Google's userinfo endpoint

---

## Database Schema

### `User` (accounts app)
| Field | Type | Notes |
|-------|------|-------|
| email | unique | USERNAME_FIELD |
| role | choice | super_admin / hospital_admin / staff / viewer |
| hospital | FK → Hospital | nullable for super_admin |
| is_verified | bool | |

### `Hospital` (donations app)
| Field | Type | Notes |
|-------|------|-------|
| name | str | |
| address, city | str | |
| contact_number | str | |
| blood_bank_license_number | unique str | |
| latitude, longitude | decimal | for geo-sorting |
| last_inventory_update | datetime | auto-updated on inventory save |
| is_active | bool | |

### `BloodInventory` (donations app)
| Field | Type | Notes |
|-------|------|-------|
| hospital | FK | |
| component_type | choice | RBC / Platelets / Plasma |
| abo_type | choice | A / B / AB / O |
| rh_type | choice | + / − |
| units_available | int | |
| availability_status | computed | auto-set on save |

Unique constraint: `(hospital, component_type, abo_type, rh_type)`
Index: `(component_type, abo_type, rh_type)`

### `BloodRequest` (donations app)
| Field | Type | Notes |
|-------|------|-------|
| requesting_hospital | FK | |
| component_type, abo_type, rh_type | choices | |
| units_needed | int | |
| urgency_level | choice | routine / urgent / emergency |
| status | choice | open / fulfilled / closed |
| created_by | FK → User | |
| notes | text | optional |

### `RequestResponse` (donations app)
| Field | Type | Notes |
|-------|------|-------|
| request | FK | |
| responding_hospital | FK | |
| response_status | choice | available / limited / not_available |
| message | text | |
| responded_by | FK → User | |
| timestamp | datetime | auto |

Unique constraint: `(request, responding_hospital)`

### `AuditLog` (donations app)
| Field | Type |
|-------|------|
| user | FK → User |
| action_type | str (e.g. `inventory_update`) |
| entity_type | str (e.g. `BloodInventory`) |
| entity_id | int |
| ip_address | str |
| metadata | JSON |
| timestamp | datetime (auto) |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new staff account |
| POST | `/api/auth/login/` | Email/password login |
| POST | `/api/auth/google/` | Google OAuth login |
| POST | `/api/auth/logout/` | Invalidate refresh token |
| POST | `/api/auth/refresh/` | Get new access token |
| GET/PATCH | `/api/auth/profile/me/` | Current user profile |
| GET/POST | `/api/donations/hospitals/` | List or register hospitals |
| GET/POST | `/api/donations/inventory/` | View or update blood inventory |
| GET/POST | `/api/donations/requests/` | List or create blood requests |
| PATCH | `/api/donations/requests/{id}/fulfill/` | Mark request fulfilled |
| PATCH | `/api/donations/requests/{id}/close/` | Close a request |
| GET/POST | `/api/donations/responses/` | Submit or view request responses |
| GET | `/api/donations/search/` | Search hospitals by inventory + geo |
| GET | `/api/donations/audit/` | Audit log (super_admin only) |

---

## Getting Started

### Prerequisites
- Python 3.11+
- PostgreSQL
- Node.js 20+ (for frontend)

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Configure environment
echo local > .env
# Edit .local.env with your DB credentials and SECRET_KEY

# Migrate and seed
python manage.py makemigrations accounts donations
python manage.py migrate
python manage.py seed

# Run server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`, proxies all `/api/*` calls to `http://localhost:8000`.

### Seed Test Accounts

| Role | Email | Password |
|------|-------|----------|
| super_admin | admin@bloodlink.ph | Admin@12345 |
| hospital_admin | admin.pgh@bloodlink.ph | Admin@12345 |
| staff | staff.pgh@bloodlink.ph | Staff@12345 |
| viewer | viewer@bloodlink.ph | Viewer@12345 |

---

## Important Disclaimer

BloodLink is a **prototype coordination tool** and does not:
- Replace hospital LIS (Laboratory Information Systems)
- Perform crossmatching or compatibility testing
- Guarantee blood reservation or allocation
- Provide public real-time blood inventory
- Replace official regulatory systems under the Department of Health

All transfusion decisions must follow licensed medical protocols.
