# BloodLink Code Review & Improvement Recommendations

## Overview
BloodLink is a well-structured Django REST + Next.js application for regional blood coordination. This document outlines concrete improvements across code quality, architecture, testing, documentation, and production readiness.

---

## 1. Backend Testing & Coverage

### Issues
- **No test files visible** in the donations app (only one test file in frontend)
- No test coverage configuration in place
- Risk of regressions when modifying core APIs (blood requests, inventory, responses)

### Recommendations
1. **Add comprehensive test suite** for:
   - `BloodInventory` model: auto-computed status, `last_inventory_update` timestamp updates, unique constraint enforcement
   - `BloodRequest` lifecycle: creation, status transitions (open → fulfilled → closed)
   - `RequestResponse`: uniqueness per (request, hospital), preventing duplicate responses
   - Permission checks: ensure only staff+ can create inventory, only hospital_admin+ can close requests
   - Geo-search: haversine distance calculations, distance sorting accuracy
   - Auth flows: token refresh, logout blacklisting, role-based access

2. **Create test fixtures/factories** for:
   - Hospital with coordinates
   - BloodRequest with responses
   - Multiple users with different roles

3. **Coverage target**: 80%+ for `donations/` and `accounts/` apps

---

## 2. Database Indexes & Query Optimization

### Issues
- `BloodInventory` has only component/ABO/Rh index; missing critical ones:
  - **`(hospital_id, availability_status)`**: frequently filtered in search
  - **`(hospital_id, last_updated DESC)`**: staleness checks
  - **`(units_available DESC)`**: availability filtering
- `BloodRequest` and `RequestResponse` missing indexes:
  - **`(requesting_hospital_id, status)`**: to find open requests per hospital
  - **`(request_id, responding_hospital_id)`**: to check if hospital already responded
- No analysis of slow queries; could benefit from query audit

### Recommendations
1. Add missing indexes in migrations:
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

2. Enable Django query logging in development to identify N+1 queries
3. Use `select_related()` / `prefetch_related()` comprehensively (already done well in views)

---

## 3. Error Handling & Validation

### Issues
- **Permissive error responses**: `SearchHospitalsView.get()` silently skips malformed coordinates instead of returning 400
  ```python
  try:
      lat, lon = float(lat), float(lon)
      ...
  except (ValueError, TypeError):
      pass  # silently skip sorting
  ```
- **No custom exception handling**: Generic Django exceptions leak implementation details
- **Missing input validation**: e.g., `min_units` parameter accepts any integer; should validate > 0
- **Serializer validation** not comprehensive: BloodRequest doesn't validate that `units_needed > 0`

### Recommendations
1. Return explicit error responses for invalid input:
   ```python
   if lat and lon:
       try:
           lat, lon = float(lat), float(lon)
       except (ValueError, TypeError):
           return Response(
               {'error': 'lat and lon must be valid floats'},
               status=status.HTTP_400_BAD_REQUEST
           )
   ```

2. Add serializer-level validation:
   ```python
   def validate_units_available(self, value):
       if value < 0:
           raise serializers.ValidationError("Units cannot be negative")
       return value
   ```

3. Create custom exception classes and middleware to format all errors consistently

---

## 4. Data Integrity & Edge Cases

### Issues
- **Hospital can be null for non-super_admin users**: The code assumes `user.hospital` exists, but model allows null. This could cause crashes.
  ```python
  # Line 103 in donations/views.py
  serializer.validated_data['hospital'] = user.hospital  # Could be None!
  ```

- **Staleness detection only works in serializer**: If inventory is never queried, stale data isn't marked. No automated cleanup of old records.

- **Request response after hospital deleted**: `RequestResponse.responding_hospital` is FK with CASCADE; if hospital is deleted, responses disappear without audit trail.

### Recommendations
1. Add validation in views:
   ```python
   if not user.hospital and not user.is_super_admin:
       raise PermissionDenied("Non-admin users must belong to a hospital")
   ```

2. Implement soft-delete for Hospital instead of CASCADE:
   ```python
   is_active = models.BooleanField(default=True)
   # Change FK: on_delete=models.PROTECT, then check is_active in queries
   ```

3. Add `@transaction.atomic` to ensure inventory and hospital timestamp updates are atomic

---

## 5. Authentication & JWT Token Management

### Issues
- **No refresh token rotation verification**: simplejwt has rotation enabled but code doesn't enforce one-time use
- **Token blacklist check every request**: Could be slow under high load; consider caching blacklist
- **No token expiration handling on frontend**: client needs explicit error handling when token expires
- **Google OAuth endpoint not verified**: `/api/auth/google/` isn't shown in the code. Ensure it validates against Google's keys

### Recommendations
1. Add explicit token validation logic:
   ```python
   # In settings: enable token blacklist checking at request level
   REST_FRAMEWORK = {
       'DEFAULT_AUTHENTICATION_CLASSES': [
           'rest_framework_simplejwt.authentication.JWTAuthentication',
       ],
   }
   ```

2. Frontend: Add token refresh interceptor in `api/client.ts`:
   ```typescript
   if (status === 401) {
       // Attempt refresh; if fails, redirect to login
       const refreshed = await refreshToken();
       if (!refreshed) window.location.href = '/auth/login';
   }
   ```

3. Document Google OAuth validation steps in CLAUDE.md

---

## 6. Frontend State Management & Error Handling

### Issues
- **No global error state**: Each component handles errors independently; no centralized error UI
- **localStorage for sensitive tokens**: XSS vulnerability if injected. Consider httpOnly cookies instead (requires backend support)
- **No retry logic for failed requests**: Network hiccup = silent failure
- **Missing loading states**: Some requests might not show loading spinner
- **API client doesn't handle 401 automatically**: Token refresh not integrated

### Recommendations
1. Create a `useApi` hook with automatic refresh:
   ```typescript
   export function useApi<T>() {
     const [state, setState] = useState({ data: null, loading: false, error: null });
     
     const request = async (fn: () => Promise<T>) => {
       setState(s => ({ ...s, loading: true }));
       try {
         const result = await fn();
         setState({ data: result, loading: false, error: null });
       } catch (error) {
         if (error.status === 401) {
           await refreshToken(); // Auto-retry
           // ...
         }
         setState(s => ({ ...s, error: error.message }));
       }
     };
     return { ...state, request };
   }
   ```

2. Add global error boundary and toast notifications (use shadcn/ui)

3. Implement exponential backoff retry for network failures

---

## 7. Code Organization & Documentation

### Issues
- **Serializers are in single file**: `donations/serializers.py` could become 500+ lines; should split by entity
- **No docstrings on serializer fields**: unclear what each endpoint returns (e.g., `is_stale` in HospitalSerializer not documented)
- **Missing API request/response examples**: CLAUDE.md has endpoint table but not example payloads
- **Frontend API routes unclear**: No centralized list of all endpoints (should mirror backend)

### Recommendations
1. Split `donations/serializers.py`:
   ```
   donations/
   ├── serializers/
   │   ├── __init__.py
   │   ├── inventory.py (BloodInventorySerializer, etc.)
   │   ├── requests.py (BloodRequestSerializer, RequestResponseSerializer)
   │   └── hospitals.py (HospitalSerializer)
   ```

2. Add rich docstrings:
   ```python
   class BloodRequestSerializer(serializers.ModelSerializer):
       """
       Represent an inter-hospital blood request.
       
       Fields:
         - requesting_hospital: ID of hospital making the request
         - status: 'open' | 'fulfilled' | 'closed'
         - responses: List of RequestResponse objects (nested, read-only)
       """
   ```

3. Add request/response examples to CLAUDE.md for each endpoint

---

## 8. Frontend Type Safety

### Issues
- **No `api/types.ts`**: Endpoints not type-checked against API responses
- **Hardcoded strings**: `/api/donations/requests`, `/api/donations/inventory` duplicated across components
- **Missing error types**: `ApiResult` in client.ts doesn't distinguish between different error types (validation, server, network)

### Recommendations
1. Create `src/api/endpoints.ts`:
   ```typescript
   export const ENDPOINTS = {
     hospitals: {
       list: '/api/donations/hospitals/',
       search: '/api/donations/search/',
     },
     inventory: {
       list: '/api/donations/inventory/',
       update: (id: number) => `/api/donations/inventory/${id}/`,
     },
     requests: {
       list: '/api/donations/requests/',
       create: '/api/donations/requests/',
       fulfill: (id: number) => `/api/donations/requests/${id}/fulfill/`,
     },
   } as const;
   ```

2. Add response type definitions:
   ```typescript
   interface Hospital {
     id: number;
     name: string;
     latitude: number;
     longitude: number;
     is_stale: boolean;
     // ...
   }
   ```

3. Enhance API client with typed errors

---

## 9. Production Readiness

### Issues
- **ALLOWED_HOSTS hard-coded to localhost**: Will break in production
- **No CSRF protection configured**: If frontend moves to different domain, CSRF tokens won't work
- **DEBUG=True by default**: Leaks stack traces and settings in error responses
- **No rate limiting**: API endpoints can be abused (e.g., spam blood requests)
- **No logging**: Can't debug production issues without application logs
- **HTTPS not enforced in Django settings**: Should set SECURE_SSL_REDIRECT, SECURE_HSTS_SECONDS

### Recommendations
1. Update settings for environment:
   ```python
   ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')
   SECURE_SSL_REDIRECT = not DEBUG
   SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
   SESSION_COOKIE_SECURE = not DEBUG
   CSRF_COOKIE_SECURE = not DEBUG
   ```

2. Add rate limiting:
   ```python
   # settings.py
   REST_FRAMEWORK = {
       'DEFAULT_THROTTLE_CLASSES': [
           'rest_framework.throttling.AnonRateThrottle',
           'rest_framework.throttling.UserRateThrottle'
       ],
       'DEFAULT_THROTTLE_RATES': {
           'anon': '100/hour',
           'user': '1000/hour'
       }
   }
   ```

3. Configure logging:
   ```python
   LOGGING = {
       'version': 1,
       'handlers': {
           'file': {
               'level': 'INFO',
               'class': 'logging.handlers.RotatingFileHandler',
               'filename': 'bloodlink.log',
           },
       },
       'root': {'handlers': ['file'], 'level': 'INFO'},
   }
   ```

---

## 10. Missing Features & Considerations

### Issues
- **No password reset flow**: Users who forget passwords can't recover
- **No email notifications**: Staff don't get alerted to new blood requests
- **No versioning strategy**: API v1 should be explicitly marked; future changes require migration plan
- **No pagination size limits**: Could return 10,000+ records if not careful
- **Hospital search doesn't verify coordinates valid**: Can be -90 to 90 latitude, -180 to 180 longitude

### Recommendations
1. Add password reset endpoint chain:
   - `POST /api/auth/password-reset/` → send email
   - `POST /api/auth/password-reset-confirm/{uid}/{token}/` → confirm

2. Add optional email notification system:
   - Django Celery for async tasks
   - Email backend (SendGrid, AWS SES)
   - Template for "New Blood Request Available"

3. Enforce pagination limits:
   ```python
   class Pagination(PageNumberPagination):
       page_size = 20
       page_size_query_param = 'page_size'
       max_page_size = 100
   ```

4. Add coordinate validation to Hospital model:
   ```python
   from django.core.validators import MinValueValidator, MaxValueValidator
   
   latitude = models.DecimalField(
       ...,
       validators=[MinValueValidator(-90), MaxValueValidator(90)]
   )
   ```

---

## 11. Documentation Gaps

### Issues
- **No deployment guide**: How to deploy to production (Heroku, Docker, AWS)?
- **No database backup strategy**: Critical to prevent data loss
- **No disaster recovery plan**: What if DB goes down?
- **Frontend .env.example missing**: Should document all required vars
- **No ER diagram**: Hard to understand relationships visually

### Recommendations
1. Create `DEPLOYMENT.md` with:
   - Docker setup (Dockerfile, docker-compose.yml)
   - Environment variables checklist
   - Database migrations steps
   - Vercel setup for frontend
   - Nginx reverse proxy config

2. Create backup strategy docs:
   - Daily PostgreSQL backups to S3
   - Automated restore procedures

3. Generate ER diagram using `django-extensions`:
   ```bash
   python manage.py graph_models -a -o models.png
   ```

---

## 12. Development Workflow Improvements

### Issues
- **No CI/CD pipeline**: No automated testing on push
- **Pre-commit hooks missing**: Code quality checks not enforced
- **Seed command is great, but no documented seed strategy**: Should document what each seed creates
- **No makefile/justfile**: Commands hard to discover

### Recommendations
1. Add GitHub Actions CI:
   ```yaml
   # .github/workflows/test.yml
   - Backend tests (pytest)
   - Frontend linting + tests
   - Django checks (security, migrations)
   ```

2. Add pre-commit hooks:
   ```yaml
   # .pre-commit-config.yaml
   repos:
     - repo: https://github.com/psf/black
       rev: 23.1.0
       hooks:
         - id: black
     - repo: https://github.com/PyCQA/flake8
       hooks:
         - id: flake8
   ```

3. Create Justfile for common commands:
   ```
   alias b := backend
   alias f := frontend
   
   backend *args:
       cd backend && python manage.py {{args}}
   
   seed:
       cd backend && python manage.py seed --flush
   ```

---

## Summary of Priority Improvements

| Priority | Area | Effort | Impact |
|----------|------|--------|--------|
| 🔴 High | Add backend tests | 3-4 days | Prevent regressions, catch bugs early |
| 🔴 High | Validate user.hospital is not null | 2 hours | Prevent runtime crashes |
| 🔴 High | Add database indexes | 4 hours | Improve query performance |
| 🟡 Medium | Frontend type safety (endpoints, responses) | 2 days | Catch API bugs before runtime |
| 🟡 Medium | Production settings (ALLOWED_HOSTS, HTTPS, rate limiting) | 1 day | Enable safe deployment |
| 🟡 Medium | Error handling improvements | 2 days | Better UX, easier debugging |
| 🟢 Low | Code organization (split serializers) | 1 day | Maintainability |
| 🟢 Low | Add API docs with examples | 1 day | Easier onboarding |

---

## Questions for the Team

1. **Authentication**: Are you planning to move tokens to httpOnly cookies, or keep localStorage?
2. **Email notifications**: Should staff be notified of new blood requests? This would require Celery + email backend.
3. **Deployment target**: AWS, Vercel, Docker? This affects production settings.
4. **Multi-hospital admin**: Can a hospital_admin manage > 1 hospital, or 1:1 ratio?
5. **Audit log retention**: Should old audit logs be archived or deleted after N days?

---

## Next Steps

1. **Create GitHub issues** for each improvement area
2. **Assign priority labels** (high/medium/low)
3. **Estimate story points** per issue
4. **Plan sprints** to tackle them incrementally
5. **Add CI/CD** to catch issues automatically

