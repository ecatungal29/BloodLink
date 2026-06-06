# BloodLink Repository Analysis Summary
**Generated**: 2026-06-06

---

## 📋 Executive Overview

**BloodLink** is a well-architected Django REST + Next.js 15 hospital coordination system designed to help blood bank staff find available blood components across participating facilities.

### Current State: ✅ **Solid Foundation, ⚠️ Not Yet Production-Ready**

**Strengths:**
- ✅ Clear architecture with separation of concerns (accounts app, donations app)
- ✅ Proper RBAC implementation (4 roles with enforced permissions)
- ✅ Audit logging integrated into all write operations
- ✅ Smart blood search with Haversine geo-sorting
- ✅ Modern frontend stack (Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui)
- ✅ Database schema is well-normalized with appropriate FK relationships
- ✅ JWT authentication with token blacklist support

**Critical Gaps:**
- 🔴 **Zero backend test coverage** — high regression risk
- 🔴 **Missing database indexes** — will cause performance issues at scale
- 🔴 **Production settings hardcoded** — ALLOWED_HOSTS, no SSL enforcement, no rate limiting
- 🔴 **user.hospital can be null** — potential runtime crashes
- 🟡 **Frontend lacks 401 token refresh handling** — session expiry breaks UX
- 🟡 **No global error handling** — silent failures common
- 🟡 **Error validation permissive** — invalid input silently ignored

---

## 🏗️ Architecture Overview

### Backend Stack
- **Django 4.2** + **Django REST Framework**
- **PostgreSQL** for persistence
- **JWT authentication** via `djangorestframework-simplejwt`
- **Google OAuth** support (token verification against Google's userinfo endpoint)

### Frontend Stack
- **Next.js 15** (React 19, TypeScript)
- **Tailwind CSS** + **shadcn/ui** components
- **Framer Motion** for micro-animations
- Centralized API client with automatic Bearer token injection

### Database Schema (Clean & Normalized)
```
User (custom AbstractUser)
  ├── email (USERNAME_FIELD)
  ├── role (super_admin, hospital_admin, staff, viewer)
  ├── hospital → FK to Hospital (nullable for super_admin)
  └── is_verified

Hospital
  ├── name, address, city, contact_number
  ├── blood_bank_license_number (unique)
  ├── latitude, longitude (for geo-sorting)
  ├── last_inventory_update (auto-updated)
  └── is_active

BloodInventory (Unique: hospital + component_type + abo_type + rh_type)
  ├── hospital → FK
  ├── component_type (RBC, Platelets, Plasma)
  ├── abo_type, rh_type
  ├── units_available (int)
  └── availability_status (computed: adequate/low/critical/none/unverified)

BloodRequest
  ├── requesting_hospital → FK
  ├── component_type, abo_type, rh_type
  ├── units_needed, urgency_level
  ├── status (open, fulfilled, closed)
  ├── created_by → FK to User
  └── notes

RequestResponse (Unique: request + responding_hospital)
  ├── request → FK
  ├── responding_hospital → FK
  ├── response_status (available, limited, not_available)
  ├── message, responded_by → FK to User
  └── timestamp

AuditLog (Append-only)
  ├── user, action_type, entity_type, entity_id
  ├── ip_address, metadata (JSON)
  └── timestamp
```

---

## 📊 Current Code Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Backend Tests | 0 coverage | 🔴 **Critical** |
| Frontend Tests | 1 file only | 🟡 **Medium** |
| Lines in `donations/serializers.py` | 149 | ✅ Manageable |
| Lines in `donations/views.py` | 377 | ✅ Good |
| Database Indexes | ~2 (partial) | 🔴 **Critical** |
| Production Settings | Hardcoded | 🔴 **Critical** |
| Frontend Endpoints | Hardcoded strings | 🟡 **Medium** |

---

## 🔴 Critical Issues (Must Fix Before Production)

### 1. **Zero Backend Test Coverage**
- **Impact**: High regression risk, bugs go undetected
- **Current state**: No test files in `accounts/` or `donations/`
- **Effort**: 3-4 days
- **Files to create**:
  ```
  backend/
  ├── conftest.py  # pytest config + fixtures
  ├── accounts/tests/
  │   ├── __init__.py
  │   ├── test_models.py       # User roles, hospital FK
  │   ├── test_views.py        # Auth endpoints
  │   ├── test_permissions.py  # Permission classes
  │   └── test_auth.py         # JWT, refresh, logout
  └── donations/tests/
      ├── __init__.py
      ├── test_models.py       # BloodInventory status, Hospital staleness
      ├── test_views.py        # Search, CRUD, permissions
      ├── test_serializers.py  # Computed fields, validation
      └── test_utils.py        # Haversine distance
  ```
- **Priority test cases**:
  - `BloodInventory.compute_status()` with 0, 1, 3, 4, 10, 11 units
  - `BloodRequest` lifecycle transitions (open → fulfilled → closed)
  - `RequestResponse` uniqueness per (request, hospital)
  - Permission denial for viewer/staff across hospitals
  - Haversine distance accuracy

### 2. **Missing Database Indexes**
- **Impact**: 50-100x slower queries on production scale
- **Current**: Only `(component_type, abo_type, rh_type)` and `(hospital_id)` indexes exist
- **Missing**:
  - `BloodInventory`: `(hospital_id, availability_status)`, `(hospital_id, -last_updated)`, `(-units_available)`
  - `BloodRequest`: `(requesting_hospital_id, status)`
  - `RequestResponse`: `(request_id, responding_hospital_id)`
- **Effort**: 4 hours (+ testing)
- **Impact**: Critical for SearchHospitalsView performance

### 3. **user.hospital Can Be Null (Crash Risk)**
- **Problem**: Model allows `hospital = NULL`, but views assume it exists
- **Location**: `donations/views.py:103` — `serializer.validated_data['hospital'] = user.hospital` will crash if null
- **Risk**: Runtime `AttributeError` when staff user's hospital is null
- **Effort**: 2 hours
- **Solution**: Add validation in views + model-level constraint

### 4. **Production Settings Hardcoded**
- **Current**: `ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']`
- **Missing**:
  - `SECURE_SSL_REDIRECT`
  - `SECURE_HSTS_SECONDS` (enforce HTTPS)
  - `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`
  - Rate limiting
  - Logging configuration
- **Effort**: 2 hours
- **Blocker**: Cannot deploy to production without this

---

## 🟡 Medium-Priority Issues (Next 2 Weeks)

### 5. **Frontend Token Refresh Not Handled**
- **Issue**: When access token expires (60 min), requests fail silently with no retry
- **Current**: `frontend/src/api/client.ts` lacks 401 error handling
- **Fix**: Add automatic token refresh on 401
- **Effort**: 2-3 hours
- **Impact**: Users get logged out without warning

### 6. **No Global Error UI**
- **Issue**: Each component handles errors independently, silent failures are common
- **Solution**: Create error context + toast component
- **Effort**: 2 hours
- **Impact**: Better UX, users see what went wrong

### 7. **Error Validation Too Permissive**
- **Issue**: `SearchHospitalsView` silently skips malformed coordinates instead of returning 400
- **Solution**: Add explicit error responses for invalid input
- **Effort**: 2-3 hours
- **Impact**: Better data integrity, clearer error messages

### 8. **Frontend Type Safety – Missing Endpoints File**
- **Issue**: Endpoints hardcoded across components (`/api/donations/requests`, etc.)
- **Solution**: Create `src/api/endpoints.ts` with centralized endpoint definitions
- **Effort**: 1-2 hours
- **Impact**: Refactoring safety, IDE autocomplete

---

## 🟢 Low-Priority Issues (Nice to Have)

### 9. **Serializers File Growing**
- **Current**: `donations/serializers.py` = 149 lines
- **Recommendation**: When exceeds 300 lines, split into:
  - `hospitals.py`, `inventory.py`, `requests.py`, `audit.py`
- **Effort**: 1 hour

### 10. **No CI/CD Pipeline**
- **Missing**: Automated testing on push
- **Recommendation**: GitHub Actions workflow for:
  - Backend tests (pytest)
  - Frontend linting + tests
  - Django security checks
- **Effort**: 4 hours

### 11. **Missing Features**
- Password reset flow
- Email notifications for new requests
- Soft deletes for Hospital (currently CASCADE deletes all inventory)
- Coordinate validation (±90 lat, ±180 lon)

---

## ✅ What's Done Well

| Area | Status | Notes |
|------|--------|-------|
| **Authentication** | ✅ | JWT + Google OAuth, proper token blacklist |
| **Authorization** | ✅ | 4-tier RBAC with permission classes |
| **Audit Logging** | ✅ | All write actions logged with IP, user, metadata |
| **Data Scoping** | ✅ | Non-super_admin users scoped to their hospital |
| **API Design** | ✅ | RESTful, consistent naming, proper HTTP methods |
| **Frontend Type Safety** | 🟡 | TypeScript exists, but endpoints hardcoded |
| **Database Schema** | ✅ | Normalized, proper constraints, clear relationships |
| **UI/UX** | ✅ | Modern design, Tailwind + shadcn/ui, responsive |

---

## 📅 Recommended Implementation Plan

### Phase 1: Unblock Production (Week 1 – ~10 days)
1. **Add backend tests** (3-4 days)
   - Set up pytest + factory_boy
   - Write model, view, serializer, permission tests
   - Target 80%+ coverage
   
2. **Add database indexes** (4 hours)
   - Create migration
   - Test with EXPLAIN ANALYZE
   
3. **Validate user.hospital** (2 hours)
   - Add view-level check
   - Add model-level constraint
   
4. **Fix production settings** (2 hours)
   - Environment-aware ALLOWED_HOSTS
   - Add security headers
   - Add rate limiting & logging

### Phase 2: Session & Error Handling (Week 2-3 – ~7 days)
5. **Token refresh on 401** (2-3 hours)
6. **Global error UI** (2-3 hours)
7. **Error validation improvements** (2-3 hours)
8. **Frontend endpoints file** (1-2 hours)

### Phase 3: Code Quality (Week 4+ – ~5 days)
9. **Split serializers** (1 hour)
10. **CI/CD pipeline** (4 hours)
11. **Soft deletes** (2 hours)
12. **Deployment guide** (4 hours)

---

## 🎯 Key Metrics to Track

| Metric | Target | Current | Blocker |
|--------|--------|---------|---------|
| Backend test coverage | 80%+ | 0% | ✅ Yes |
| Database indexes | 6-8 | 2 | ✅ Yes |
| Frontend 401 handling | Auto-retry | None | ✅ Yes |
| Production settings | Environment-aware | Hardcoded | ✅ Yes |
| Error messages | Consistent format | Mixed | ⚠️ High |
| TypeScript endpoints | Centralized | Hardcoded | ⚠️ Medium |

---

## 📝 Quick Commands

```bash
# Backend setup
cd backend
python -m venv venv
venv/Scripts/activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Environment setup
echo local > .env
# Edit .local.env with DB credentials

# Database
python manage.py makemigrations accounts donations
python manage.py migrate
python manage.py seed --flush

# Run server
python manage.py runserver

# Frontend setup
cd frontend
npm install
npm run dev

# Access
Backend: http://localhost:8000
Frontend: http://localhost:3000
```

---

## 🧪 Seed Test Accounts

| Role | Email | Password |
|------|-------|----------|
| super_admin | admin@bloodlink.ph | Admin@12345 |
| hospital_admin | admin.pgh@bloodlink.ph | Admin@12345 |
| staff | staff.pgh@bloodlink.ph | Staff@12345 |
| viewer | viewer@bloodlink.ph | Viewer@12345 |

---

## 📚 Related Documents

- **CODE_ANALYSIS.md** — Detailed technical analysis with code examples
- **IMPROVEMENTS.md** — Comprehensive improvement recommendations
- **PRIORITY_ACTIONS.md** — Actionable checklist with time estimates
- **CLAUDE.md** (backend) — Development guide and command reference
- **README.md** — Project overview and features

---

## ⚠️ Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Zero test coverage hides bugs | 🔴 High | Write tests first, then refactor |
| Missing indexes → slow queries at scale | 🔴 High | Add indexes now, test in staging |
| Null hospital crashes views | 🔴 High | Add validation, test all code paths |
| Token refresh breaks other flows | 🟡 Medium | Test all auth endpoints comprehensively |
| Production settings affect dev workflow | 🟡 Medium | Use .env files, separate per environment |

---

## 🚀 Next Steps

1. **Review this summary** with the team
2. **Prioritize Phase 1 tasks** (testing is critical)
3. **Create GitHub issues** for each section
4. **Start with backend tests** — this unblocks other work
5. **Set up CI/CD early** — catch regressions automatically
6. **Plan 2-week sprints** with story points

---

## 📖 Glossary

- **RBAC**: Role-Based Access Control
- **JWT**: JSON Web Token (stateless authentication)
- **Haversine**: Formula for distance between two points on a sphere
- **Staleness**: Inventory not updated in >24 hours
- **Seeding**: Loading test data into database
- **Audit Log**: Immutable record of all write actions

---

## 💡 Questions for the Team

1. Should tokens move from localStorage to httpOnly cookies (more secure but requires backend changes)?
2. Should staff get email notifications for new blood requests? (Requires Celery + email backend)
3. What's the deployment target? (AWS, Vercel, Docker, on-premises?)
4. Should old audit logs be archived after N days?
5. Can a hospital_admin manage multiple hospitals, or is it 1:1?

---

**Last Updated**: 2026-06-06  
**Author**: Claude Code Analysis  
**Status**: Ready for Implementation
