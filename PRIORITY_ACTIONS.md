# BloodLink: Priority Actions Checklist

This document maps findings from `CODE_ANALYSIS.md` to actionable tasks with time estimates.

## 🔴 CRITICAL (This Week)

### 1. Add Backend Tests
**Reference**: CODE_ANALYSIS.md §1, IMPROVEMENTS.md §1  
**Time**: 3–4 days  
**Blocking**: Yes — cannot merge code without test coverage

- [ ] Set up pytest + factory_boy
- [ ] Create `backend/accounts/tests/` with test fixtures
- [ ] Create `backend/donations/tests/` with test fixtures
- [ ] Write tests for:
  - [ ] BloodInventory.compute_status() (0, 1, 3, 4, 10, 11 units)
  - [ ] BloodRequest lifecycle (open → fulfilled → closed)
  - [ ] RequestResponse uniqueness constraint
  - [ ] Permission classes (IsSuperAdmin, IsStaffOrAbove)
  - [ ] Haversine distance calculation
  - [ ] JWT token refresh and logout blacklist
- [ ] Set up coverage reporting (target: 80%+)
- [ ] Add to CI/CD (see section 12)

**Files to create**:
```
backend/accounts/tests/__init__.py
backend/accounts/tests/test_models.py
backend/accounts/tests/test_views.py
backend/accounts/tests/test_permissions.py
backend/accounts/tests/test_auth.py
backend/donations/tests/__init__.py
backend/donations/tests/test_models.py
backend/donations/tests/test_views.py
backend/donations/tests/test_serializers.py
backend/donations/tests/test_utils.py
backend/conftest.py  # pytest config + fixtures
```

---

### 2. Add Missing Database Indexes
**Reference**: CODE_ANALYSIS.md §2, IMPROVEMENTS.md §2  
**Time**: 4 hours  
**Blocking**: Performance only, but critical for scale

- [ ] Create migration: `python manage.py makemigrations donations --name add_missing_indexes`
- [ ] Add indexes to BloodInventory:
  - `(hospital_id, availability_status)`
  - `(hospital_id, -last_updated)`
  - `(-units_available)`
- [ ] Add indexes to BloodRequest:
  - `(requesting_hospital_id, status)`
- [ ] Add indexes to RequestResponse:
  - `(request_id, responding_hospital_id)`
- [ ] Run migration on dev DB and verify with EXPLAIN ANALYZE
- [ ] Update `CODE_ANALYSIS.md` with before/after query times

**Steps**:
```bash
cd backend
python manage.py makemigrations donations --name add_missing_indexes
python manage.py migrate
python manage.py shell
# Paste: from django.test.utils import CaptureQueriesContext
# Run a search query and check execution time
```

---

### 3. Validate user.hospital Is Not Null
**Reference**: CODE_ANALYSIS.md §3, IMPROVEMENTS.md §4  
**Time**: 2 hours  
**Blocking**: Yes — runtime crash risk

- [ ] Add validation in `donations/views.py` BloodInventoryViewSet.perform_create():
  ```python
  if not user.is_super_admin and not user.hospital:
      raise PermissionDenied("Staff users must belong to a hospital")
  ```
- [ ] Add model-level validation in `accounts/models.py` User.clean():
  ```python
  def clean(self):
      if self.role != 'super_admin' and not self.hospital:
          raise ValidationError(f"{self.get_role_display()} users must be assigned a hospital")
  ```
- [ ] Add test in `accounts/tests/test_models.py`:
  ```python
  def test_non_admin_must_have_hospital()
  ```
- [ ] Test all views that rely on user.hospital (SearchHospitalsView, BloodRequestViewSet, etc.)

---

### 4. Fix Production Settings
**Reference**: CODE_ANALYSIS.md §4, IMPROVEMENTS.md §9  
**Time**: 2 hours  
**Blocking**: Yes — cannot deploy to production

- [ ] Update `bloodlink/settings.py`:
  - [ ] `ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')`
  - [ ] Add SECURE_SSL_REDIRECT, SECURE_HSTS_SECONDS, SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE
  - [ ] Add rate limiting (DEFAULT_THROTTLE_CLASSES)
  - [ ] Add logging configuration (LOGGING dict)
- [ ] Create `.production.env.example` template
- [ ] Create `.staging.env.example` template
- [ ] Test locally with DEBUG=false
- [ ] Document in DEPLOYMENT.md (future task)

---

## 🟡 MEDIUM (Next 2 Weeks)

### 5. Token Refresh on 401
**Reference**: CODE_ANALYSIS.md §5, IMPROVEMENTS.md §6  
**Time**: 2–3 hours  
**Impact**: Fixes session expiry UX

- [ ] Create `frontend/src/hooks/useRefreshToken.ts` with refreshAccessToken() function
- [ ] Update `frontend/src/api/client.ts` apiFetch() to retry on 401
- [ ] Test: manually expire token and verify auto-refresh works
- [ ] Test: if refresh fails, redirect to /auth/login

---

### 6. Global Error UI & Boundary
**Reference**: CODE_ANALYSIS.md §7, IMPROVEMENTS.md §6  
**Time**: 2–3 hours  
**Impact**: Catch silent failures, better UX

- [ ] Create `frontend/src/context/ErrorContext.tsx` with ErrorProvider
- [ ] Create `frontend/src/components/ErrorToast.tsx` with toast UI
- [ ] Wrap `frontend/src/app/layout.tsx` with ErrorProvider
- [ ] Update all API-calling components to use `useError()` hook
- [ ] Test: trigger network error and verify toast appears

---

### 7. Error Handling & Validation
**Reference**: CODE_ANALYSIS.md §6, IMPROVEMENTS.md §3  
**Time**: 2–3 hours  
**Impact**: Better error messages, data integrity

- [ ] Add serializer validation in `donations/serializers.py`:
  - `BloodInventorySerializer.validate_units_available()` — no negatives
  - `BloodRequestSerializer.validate_units_needed()` — must be > 0
- [ ] Fix SearchHospitalsView in `donations/views.py` to return 400 for invalid lat/lon
- [ ] Add coordinate range validation to Hospital model (±90 lat, ±180 lon)
- [ ] Test: invalid inputs should return 400 with helpful message

---

### 8. Frontend Type Safety – Endpoints File
**Reference**: CODE_ANALYSIS.md §9, IMPROVEMENTS.md §8  
**Time**: 1–2 hours  
**Impact**: Refactoring safety, IDE autocomplete

- [ ] Create `frontend/src/api/endpoints.ts` with ENDPOINTS const
- [ ] Update all components to import and use ENDPOINTS instead of hardcoded strings
- [ ] Remove duplicated endpoint strings from codebase
- [ ] Test: search/replace should find 0 instances of `/api/donations/` outside endpoints.ts

---

## 🟢 LOW (Nice to Have)

### 9. Split Serializers (when file > 300 lines)
**Reference**: CODE_ANALYSIS.md §10, IMPROVEMENTS.md §7

- [ ] Create `backend/donations/serializers/` directory
- [ ] Move serializers to separate files: `hospitals.py`, `inventory.py`, `requests.py`, `audit.py`
- [ ] Update imports in `views.py` and `__init__.py`

---

### 10. CI/CD Pipeline
**Reference**: CODE_ANALYSIS.md §12, IMPROVEMENTS.md §12

- [ ] Create `.github/workflows/test.yml` for Django tests
- [ ] Add frontend linting + testing
- [ ] Set up pre-commit hooks (black, flake8, isort)
- [ ] Enable branch protection requiring passing tests

---

### 11. Soft Deletes for Hospital
**Reference**: CODE_ANALYSIS.md §13, IMPROVEMENTS.md §4

- [ ] Change Hospital FK from CASCADE to PROTECT
- [ ] Filter is_active=True in all queries
- [ ] Test: deleting hospital with data should raise error

---

## Implementation Phases

### Phase 1: Unblock Production (Week 1)
1. Backend tests
2. Database indexes
3. user.hospital validation
4. Production settings

**Estimated time**: 8–10 days (1 developer)

### Phase 2: Session & Error Handling (Week 2–3)
5. Token refresh on 401
6. Global error UI
7. Error handling & validation
8. Frontend endpoints file

**Estimated time**: 5–7 days (1 developer)

### Phase 3: Code Quality (Week 4+)
9. Split serializers
10. CI/CD pipeline
11. Soft deletes
12. Deployment guide

**Estimated time**: 4–5 days

---

## Tracking Template

Copy this to a GitHub issue or project board:

```markdown
## Phase 1: Production Readiness (Week 1)

- [ ] Backend tests (4 days)
  - [ ] Set up pytest framework
  - [ ] Write model tests
  - [ ] Write view tests
  - [ ] Achieve 80% coverage

- [ ] Database indexes (4 hours)
  - [ ] Create migration
  - [ ] Verify with EXPLAIN ANALYZE

- [ ] user.hospital validation (2 hours)
  - [ ] Add view-level check
  - [ ] Add model-level validation
  - [ ] Add test

- [ ] Production settings (2 hours)
  - [ ] Update ALLOWED_HOSTS
  - [ ] Add security headers
  - [ ] Add rate limiting
  - [ ] Add logging

## Phase 2: Session & Error Handling (Week 2)

- [ ] Token refresh (2–3 hours)
- [ ] Global error UI (2–3 hours)
- [ ] Error handling & validation (2–3 hours)
- [ ] Frontend endpoints (1–2 hours)

## Phase 3: Code Quality (Week 4)

- [ ] Split serializers (1 hour)
- [ ] CI/CD pipeline (4 hours)
- [ ] Deployment guide (4 hours)
```

---

## Acceptance Criteria

### Phase 1 Complete When:
- ✅ Backend test suite runs with `pytest` (80%+ coverage)
- ✅ All database indexes created and tested
- ✅ Non-super_admin users cannot have null hospital
- ✅ Django settings work for dev/staging/production
- ✅ Deployment guide created

### Phase 2 Complete When:
- ✅ Token refresh auto-triggers on 401
- ✅ Error context provider wraps entire app
- ✅ All error responses use consistent format
- ✅ Frontend uses ENDPOINTS const throughout
- ✅ Coordinate validation prevents invalid data

### Phase 3 Complete When:
- ✅ Serializers split into 5 files
- ✅ GitHub Actions CI/CD passes on every PR
- ✅ Pre-commit hooks prevent bad commits
- ✅ Hospital deletion protected with PROTECT FK

---

## Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Existing code has implicit assumptions about data | High | Write tests FIRST, then refactor |
| Production settings affect existing dev workflow | Medium | Use .env files for local overrides |
| Adding indexes blocks writes during migration | Medium | Run during maintenance window; test on staging first |
| Token refresh logic breaks other flows | Medium | Test all auth endpoints in test suite |
| Type changes break existing components | Low | Gradual migration using ENDPOINTS const |

