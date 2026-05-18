# BloodLink: Improvement Checklist
**Last Updated**: 2026-05-18

Use this checklist to track progress on code improvements. Issues are organized by phase.

---

## 🔴 Phase 1: Production Readiness (Week 1)

### Backend Test Suite
- [ ] Install pytest, factory_boy, pytest-django
- [ ] Create `backend/conftest.py` with shared fixtures
- [ ] Create `backend/accounts/tests/__init__.py`
- [ ] Create `backend/accounts/tests/test_models.py`
  - [ ] Test User model validation
  - [ ] Test role field choices
  - [ ] Test hospital assignment rules
- [ ] Create `backend/accounts/tests/test_views.py`
  - [ ] Test RegisterView (valid, duplicate email, validation)
  - [ ] Test LoginView (correct password, wrong password, inactive user)
  - [ ] Test RefreshTokenView (token rotation, blacklist)
  - [ ] Test LogoutView (token blacklisting)
- [ ] Create `backend/accounts/tests/test_permissions.py`
  - [ ] Test IsSuperAdmin
  - [ ] Test IsHospitalAdmin
  - [ ] Test IsStaffOrAbove
  - [ ] Test BelongsToHospital
- [ ] Create `backend/donations/tests/__init__.py`
- [ ] Create `backend/donations/tests/test_models.py`
  - [ ] Test BloodInventory.compute_status() (0, 1, 3, 4, 10, 11 units)
  - [ ] Test last_inventory_update auto-update
  - [ ] Test unique constraint enforcement
  - [ ] Test BloodRequest status transitions
  - [ ] Test RequestResponse uniqueness
  - [ ] Test Hospital staleness calculation
- [ ] Create `backend/donations/tests/test_views.py`
  - [ ] Test HospitalViewSet (list, create, update, delete permissions)
  - [ ] Test BloodInventoryViewSet (list, create, update permissions)
  - [ ] Test BloodRequestViewSet (create, status transitions)
  - [ ] Test RequestResponseViewSet (create, uniqueness)
  - [ ] Test SearchHospitalsView (with/without coords, filtering)
  - [ ] Test AuditLogViewSet (read-only, super_admin only)
- [ ] Create `backend/donations/tests/test_serializers.py`
  - [ ] Test HospitalSerializer
  - [ ] Test BloodInventorySerializer (validation)
  - [ ] Test BloodRequestSerializer (validation)
  - [ ] Test RequestResponseSerializer (validation)
- [ ] Create `backend/donations/tests/test_utils.py`
  - [ ] Test haversine_km distance calculation
  - [ ] Test log_action audit trail
  - [ ] Test get_client_ip
- [ ] Set up pytest.ini with coverage config
- [ ] Run: `pytest --cov=accounts --cov=donations --cov-report=html`
- [ ] Achieve 80%+ coverage
- [ ] Add `tests/` to .gitignore if needed
- [ ] Document how to run tests in README

**Acceptance**: `pytest` runs all tests successfully, 80%+ coverage reported

---

### Database Indexes
- [ ] Create migration: `python manage.py makemigrations donations --name add_missing_indexes`
- [ ] Add to migration:
  ```python
  # BloodInventory
  models.Index(fields=['hospital_id', 'availability_status']),
  models.Index(fields=['hospital_id', '-last_updated']),
  models.Index(fields=['-units_available']),
  
  # BloodRequest
  models.Index(fields=['requesting_hospital_id', 'status']),
  
  # RequestResponse
  models.Index(fields=['request_id', 'responding_hospital_id']),
  ```
- [ ] Run migration on dev: `python manage.py migrate`
- [ ] Test with EXPLAIN ANALYZE (verify index usage)
- [ ] Run one search query before/after and compare execution time
- [ ] Document query performance improvement

**Acceptance**: Indexes created, migration applied, verified with EXPLAIN

---

### Null Hospital Validation
- [ ] Update `donations/views.py` BloodInventoryViewSet.perform_create():
  ```python
  user = self.request.user
  if not user.is_super_admin and not user.hospital:
      raise PermissionDenied("Staff users must belong to a hospital")
  serializer.validated_data['hospital'] = user.hospital
  ```
- [ ] Update `donations/views.py` RequestResponseViewSet.perform_create() similarly
- [ ] Add to `accounts/models.py` User.clean():
  ```python
  def clean(self):
      if self.role != 'super_admin' and not self.hospital:
          raise ValidationError(f"{self.get_role_display()} users must be assigned a hospital")
  ```
- [ ] Add test: `test_non_admin_without_hospital_raises_error()`
- [ ] Test all views that rely on user.hospital
- [ ] Update ProfileViewSet if it modifies user

**Acceptance**: Non-admin users with null hospital receive 403 error, tests pass

---

### Production Settings Configuration
- [ ] Update `bloodlink/settings.py`:
  ```python
  ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')
  SECURE_SSL_REDIRECT = not DEBUG
  SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
  SESSION_COOKIE_SECURE = not DEBUG
  CSRF_COOKIE_SECURE = not DEBUG
  CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
  ```
- [ ] Add rate limiting to REST_FRAMEWORK config:
  ```python
  'DEFAULT_THROTTLE_CLASSES': [
      'rest_framework.throttling.AnonRateThrottle',
      'rest_framework.throttling.UserRateThrottle'
  ],
  'DEFAULT_THROTTLE_RATES': {
      'anon': '100/hour',
      'user': '1000/hour'
  }
  ```
- [ ] Add logging configuration:
  ```python
  LOGGING = {
      'version': 1,
      'disable_existing_loggers': False,
      'handlers': {
          'file': {
              'level': 'INFO',
              'class': 'logging.handlers.RotatingFileHandler',
              'filename': 'bloodlink.log',
              'maxBytes': 1024*1024*10,  # 10MB
              'backupCount': 5,
          },
      },
      'root': {'handlers': ['file'], 'level': 'INFO'},
  }
  ```
- [ ] Create `.production.env.example`:
  ```
  DEBUG=false
  ALLOWED_HOSTS=bloodlink.example.com,www.bloodlink.example.com
  CSRF_TRUSTED_ORIGINS=https://bloodlink.example.com
  DB_NAME=bloodlink_prod
  SECRET_KEY=your-super-secret-key-here
  GOOGLE_CLIENT_ID=your-google-client-id
  ```
- [ ] Test locally with DEBUG=false
- [ ] Verify HTTPS is enforced when DEBUG=false
- [ ] Verify rate limiting works
- [ ] Document in README

**Acceptance**: `DEBUG=false` works, HTTPS enforced, rate limiting active

---

## 🟡 Phase 2: Session & Error Handling (Week 2–3)

### Token Refresh Auto-Retry
- [ ] Create `frontend/src/hooks/useRefreshToken.ts`:
  ```typescript
  export async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;
    
    try {
      const result = await api.post('/api/auth/refresh/', { refresh: refreshToken });
      if (result.data?.access) {
        localStorage.setItem('access_token', result.data.access);
        return true;
      }
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return false;
    }
    return false;
  }
  ```
- [ ] Update `frontend/src/api/client.ts` apiFetch():
  ```typescript
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry original request
      return apiFetch<T>(path, options);
    } else {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  }
  ```
- [ ] Test: Manually set token expiry, verify auto-refresh works
- [ ] Test: If refresh fails, verify redirect to login
- [ ] Add to unit tests

**Acceptance**: 401 triggers auto-refresh, redirect to login if refresh fails

---

### Global Error UI & Context
- [ ] Create `frontend/src/context/ErrorContext.tsx`:
  ```typescript
  interface ErrorContextType {
    error: string | null;
    showError: (message: string) => void;
    clearError: () => void;
  }
  
  export const ErrorContext = createContext<ErrorContextType | null>(null);
  
  export function ErrorProvider({ children }: { children: React.ReactNode }) {
    const [error, setError] = useState<string | null>(null);
    // ... implementation
    return <ErrorContext.Provider value={{...}}>{children}</ErrorContext.Provider>;
  }
  
  export function useError() {
    const ctx = useContext(ErrorContext);
    if (!ctx) throw new Error('useError must be inside ErrorProvider');
    return ctx;
  }
  ```
- [ ] Create `frontend/src/components/ErrorToast.tsx`:
  ```typescript
  export function ErrorToast() {
    const { error, clearError } = useError();
    if (!error) return null;
    return (
      <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded">
        {error}
        <button onClick={clearError}>Dismiss</button>
      </div>
    );
  }
  ```
- [ ] Wrap `frontend/src/app/layout.tsx` with ErrorProvider
- [ ] Add ErrorToast to layout
- [ ] Update all API-calling components to use useError()
- [ ] Test: Trigger network error, verify toast appears

**Acceptance**: Any API error shows toast notification, user can dismiss

---

### Error Handling & Input Validation
- [ ] Update `backend/donations/serializers.py`:
  ```python
  class BloodInventorySerializer(serializers.ModelSerializer):
      def validate_units_available(self, value):
          if value < 0:
              raise serializers.ValidationError("Units cannot be negative")
          return value
  
  class BloodRequestSerializer(serializers.ModelSerializer):
      def validate_units_needed(self, value):
          if value <= 0:
              raise serializers.ValidationError("Must request at least 1 unit")
          return value
  ```
- [ ] Update `backend/donations/views.py` SearchHospitalsView.get():
  ```python
  if lat and lon:
      try:
          lat, lon = float(lat), float(lon)
          # ... rest of code
      except (ValueError, TypeError):
          return Response(
              {'error': 'lat and lon must be valid floats'},
              status=status.HTTP_400_BAD_REQUEST
          )
  ```
- [ ] Add coordinate validation to Hospital model:
  ```python
  from django.core.validators import MinValueValidator, MaxValueValidator
  
  latitude = models.DecimalField(
      ...,
      validators=[MinValueValidator(-90), MaxValueValidator(90)],
      ...
  )
  longitude = models.DecimalField(
      ...,
      validators=[MinValueValidator(-180), MaxValueValidator(180)],
      ...
  )
  ```
- [ ] Validate min_units > 0 in search view
- [ ] Add tests for invalid inputs
- [ ] Verify 400 responses include helpful error messages

**Acceptance**: Invalid inputs return 400 with error message, no silent failures

---

### Frontend Endpoints File
- [ ] Create `frontend/src/api/endpoints.ts`:
  ```typescript
  export const ENDPOINTS = {
    auth: {
      register: '/api/auth/register/',
      login: '/api/auth/login/',
      logout: '/api/auth/logout/',
      refresh: '/api/auth/refresh/',
      profile: '/api/auth/profile/me/',
    },
    hospitals: {
      list: '/api/donations/hospitals/',
      detail: (id: number) => `/api/donations/hospitals/${id}/`,
      create: '/api/donations/hospitals/',
      search: '/api/donations/search/',
    },
    inventory: {
      list: '/api/donations/inventory/',
      create: '/api/donations/inventory/',
      update: (id: number) => `/api/donations/inventory/${id}/`,
    },
    requests: {
      list: '/api/donations/requests/',
      create: '/api/donations/requests/',
      detail: (id: number) => `/api/donations/requests/${id}/`,
      fulfill: (id: number) => `/api/donations/requests/${id}/fulfill/`,
      close: (id: number) => `/api/donations/requests/${id}/close/`,
    },
    responses: {
      list: '/api/donations/responses/',
      create: '/api/donations/responses/',
    },
  } as const;
  ```
- [ ] Search all components for hardcoded `/api/donations/` strings
- [ ] Replace each with `ENDPOINTS.section.endpoint`
- [ ] Update imports to use ENDPOINTS
- [ ] Verify no hardcoded strings remain: `grep -r "/api/donations" frontend/src --exclude-dir=node_modules`
- [ ] Add types for responses (optional but recommended)

**Acceptance**: No hardcoded endpoint strings, all components use ENDPOINTS

---

## 🟢 Phase 3: Quality & Documentation (Week 4+)

### Code Organization (Serializers Split)
- [ ] Create `backend/donations/serializers/` directory
- [ ] Create `backend/donations/serializers/__init__.py`
- [ ] Create `backend/donations/serializers/hospitals.py` with HospitalSerializer, HospitalSearchResultSerializer
- [ ] Create `backend/donations/serializers/inventory.py` with BloodInventorySerializer
- [ ] Create `backend/donations/serializers/requests.py` with BloodRequestSerializer, RequestResponseSerializer
- [ ] Create `backend/donations/serializers/audit.py` with AuditLogSerializer
- [ ] Update `backend/donations/views.py` imports to use new structure
- [ ] Delete old `serializers.py`
- [ ] Run tests to verify nothing broke
- [ ] Update CLAUDE.md if needed

**Acceptance**: Tests pass, serializers organized by domain

---

### Soft Deletes for Hospital
- [ ] Add `is_active = BooleanField(default=True)` to Hospital model (already exists)
- [ ] Create migration to remove CASCADE delete, use PROTECT instead:
  ```python
  # Change FK in BloodInventory, BloodRequest, RequestResponse:
  hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, ...)
  ```
- [ ] Update all queries to filter `is_active=True` (already done in most places)
- [ ] Test: Attempt to delete hospital with related data → should raise error
- [ ] Add test to prevent accidental cascade deletes

**Acceptance**: Hospital deletion protected, soft-delete implemented

---

### CI/CD Pipeline (GitHub Actions)
- [ ] Create `.github/workflows/test.yml`:
  ```yaml
  name: Test & Lint
  on: [push, pull_request]
  jobs:
    django:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:15
          options: >-
            --health-cmd pg_isready
            --health-interval 10s
            --health-timeout 5s
            --health-retries 5
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-python@v4
          with: { python-version: '3.11' }
        - run: pip install -r backend/requirements.txt
        - run: cd backend && python manage.py migrate
        - run: cd backend && pytest --cov
        - run: cd backend && python manage.py check --deploy
    frontend:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with: { node-version: '20' }
        - run: cd frontend && npm install
        - run: cd frontend && npm run lint
        - run: cd frontend && npm run build
  ```
- [ ] Create `.pre-commit-config.yaml`:
  ```yaml
  repos:
    - repo: https://github.com/psf/black
      rev: 23.1.0
      hooks:
        - id: black
    - repo: https://github.com/PyCQA/flake8
      rev: 5.0.4
      hooks:
        - id: flake8
    - repo: https://github.com/PyCQA/isort
      rev: 5.12.0
      hooks:
        - id: isort
  ```
- [ ] Set up branch protection requiring passing checks
- [ ] Test: Push branch, verify CI runs
- [ ] Document in README

**Acceptance**: CI passes on every PR, pre-commit hooks prevent bad commits

---

### Documentation
- [ ] Create `DEPLOYMENT.md`:
  - [ ] Docker setup (Dockerfile, docker-compose.yml)
  - [ ] Environment variables checklist
  - [ ] Database migration steps
  - [ ] Heroku/AWS deployment guides
  - [ ] Nginx reverse proxy config
- [ ] Create `BACKUP_STRATEGY.md`:
  - [ ] Daily PostgreSQL backups to S3
  - [ ] Restore procedures
  - [ ] Disaster recovery plan
- [ ] Create `.env.example` files:
  - [ ] `backend/.env.example`
  - [ ] `frontend/.env.example`
- [ ] Generate ER diagram: `python manage.py graph_models -a -o ER_diagram.png`
- [ ] Add to README:
  - [ ] API request/response examples
  - [ ] Architecture diagram
  - [ ] Deployment instructions
  - [ ] Contributing guidelines
- [ ] Update CLAUDE.md with latest changes

**Acceptance**: New team member can set up dev environment from docs

---

## 🎯 Quick Start: First Week

If you only have 1 week, focus on **Phase 1 only**:

1. **Day 1–2**: Backend tests
   - [ ] Set up pytest
   - [ ] Write model tests
   - [ ] Write view tests
   - [ ] Aim for 80%+ coverage

2. **Day 3**: Database indexes
   - [ ] Create migration
   - [ ] Verify with EXPLAIN

3. **Day 4**: Null hospital validation
   - [ ] Add validation checks
   - [ ] Write tests

4. **Day 5**: Production settings
   - [ ] Update Django settings
   - [ ] Test with DEBUG=false

5. **Day 6–7**: Testing & verification
   - [ ] Run full test suite
   - [ ] Deploy to staging
   - [ ] Smoke test in staging

**Result**: Production-ready backend

---

## Progress Tracking Template

Copy to GitHub Issues or project board:

```markdown
## Phase 1: Production Readiness

- [ ] Backend tests (3–4 days)
  - [ ] pytest setup
  - [ ] Model tests
  - [ ] View tests
  - [ ] 80%+ coverage

- [ ] Database indexes (4 hours)
  - [ ] Create migration
  - [ ] Test with EXPLAIN

- [ ] User.hospital validation (2 hours)
  - [ ] Add view check
  - [ ] Add model validation
  - [ ] Add tests

- [ ] Production settings (2 hours)
  - [ ] Security headers
  - [ ] Rate limiting
  - [ ] Logging

**ETA**: Week of [DATE]
**Owner**: [NAME]
**Status**: 🟡 In Progress
```

---

## Acceptance Criteria

### Phase 1 Complete When:
- ✅ Backend test suite runs with `pytest` (80%+ coverage)
- ✅ All database indexes created and migrations applied
- ✅ Non-super_admin users with null hospital receive 403 error
- ✅ Django settings work for dev/staging/production (DEBUG=false tested)
- ✅ Rate limiting configured and tested
- ✅ All critical issues from CURRENT_STATE_ANALYSIS.md marked ✅

### Phase 2 Complete When:
- ✅ 401 response auto-triggers token refresh
- ✅ If refresh fails, user redirected to login
- ✅ Error context provider wraps entire app
- ✅ All error responses include helpful messages
- ✅ Invalid coordinates return 400 error
- ✅ Negative/zero units rejected by serializers
- ✅ All components use ENDPOINTS const

### Phase 3 Complete When:
- ✅ Serializers split into 5 files
- ✅ GitHub Actions CI/CD passes on every PR
- ✅ Pre-commit hooks prevent bad commits
- ✅ Hospital deletion raises ProtectedError
- ✅ Deployment guide complete
- ✅ ER diagram generated

---

## Notes

- **Do tests first**: Write tests before refactoring. They catch regressions.
- **Batch similar tasks**: Fix all validation errors in one pass, not scattered.
- **Test each phase**: Before moving to the next phase, verify the current phase works.
- **Document as you go**: Don't leave docs for the end.
- **Team sync**: Review progress weekly, adjust timeline if needed.

