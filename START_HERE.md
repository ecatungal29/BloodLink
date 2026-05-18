# BloodLink: Start Here - Top 3 Priorities This Week

**Last Updated**: 2026-05-18

---

## 🎯 The Situation

BloodLink is a well-designed Django + React app for blood inventory coordination. The code is functional and clean, **but it's missing critical pieces before production**:

1. ❌ **No tests** — Can't safely refactor or deploy
2. ⚠️ **Potential crash** — User.hospital can be None, causing 500 errors
3. 🐢 **Performance gap** — Missing database indexes will slow down at scale
4. 🚀 **Not deployment-ready** — Production settings not configured

This week, focus on the **top 3 issues** below. They unblock everything else.

---

## Priority 1: Write Backend Tests 📋

**Time**: 3–4 days  
**Why**: Without tests, any refactor is risky. Breaks will reach production.

### What to do:
1. Install test framework:
   ```bash
   cd backend
   pip install pytest pytest-django factory_boy pytest-cov
   ```

2. Create test structure:
   ```
   backend/
   ├── accounts/tests/
   │   ├── __init__.py
   │   ├── test_models.py
   │   ├── test_views.py
   │   └── test_permissions.py
   ├── donations/tests/
   │   ├── __init__.py
   │   ├── test_models.py
   │   ├── test_views.py
   │   ├── test_serializers.py
   │   └── test_utils.py
   ├── conftest.py  (shared fixtures)
   └── pytest.ini
   ```

3. Write tests for these critical areas:
   - **Models**: BloodInventory.compute_status() with different unit counts (0, 1, 3, 4, 10, 11)
   - **Models**: Hospital.last_inventory_update updates on BloodInventory save
   - **Models**: RequestResponse uniqueness (can't respond twice to same request)
   - **Views**: Permission checks (only staff+ can create inventory, only super_admin can create hospitals)
   - **Views**: BloodRequest status transitions (open → fulfilled → closed)
   - **Utils**: Haversine distance calculation accuracy
   - **Auth**: Token refresh works, logout blacklists token

4. Run and verify:
   ```bash
   pytest --cov=accounts --cov=donations --cov-report=html
   ```

### How to verify it's working:
- ✅ All tests pass
- ✅ Coverage report shows 80%+ for accounts/ and donations/
- ✅ Can run tests locally in < 30 seconds

### Why this first:
- Tests are the safety net for all other improvements
- Once you have tests, you can refactor confidently
- Tests catch bugs before they reach users

---

## Priority 2: Fix Null Hospital Crash 🛡️

**Time**: 2 hours  
**Why**: Non-admin users should always have a hospital assigned. If not, we get a crash.

### The Issue:
In `backend/donations/views.py:103`, this line assumes user.hospital exists:
```python
serializer.validated_data['hospital'] = user.hospital  # Could be None → crashes!
```

If a non-admin user somehow has `hospital=None`, this assigns None to inventory, and later code crashes.

### What to do:

**Step 1**: Add validation to views (`backend/donations/views.py`):
```python
def perform_create(self, serializer):
    user = self.request.user
    
    # ADD THIS CHECK:
    if not user.is_super_admin and not user.hospital:
        raise PermissionDenied(
            "Staff users must belong to a hospital. Contact your admin."
        )
    
    serializer.validated_data['hospital'] = user.hospital
    # ... rest of code
```

**Step 2**: Add model-level validation (`backend/accounts/models.py`):
```python
class User(AbstractUser):
    # ... existing fields ...
    
    def clean(self):
        super().clean()
        if self.role != 'super_admin' and not self.hospital:
            raise ValidationError(
                f"{self.get_role_display()} users must be assigned to a hospital"
            )
```

**Step 3**: Add test (`backend/accounts/tests/test_models.py`):
```python
def test_non_admin_user_must_have_hospital(self):
    """Non-admin users should not be allowed without a hospital."""
    user = User.objects.create(
        email='test@hospital.ph',
        role='staff',
        hospital=None  # This should fail
    )
    with self.assertRaises(ValidationError):
        user.full_clean()
```

### How to verify:
- ✅ Try to create a staff user without a hospital → get 403 error (not 500)
- ✅ Test passes: `pytest accounts/tests/test_models.py::test_non_admin_user_must_have_hospital`

### Why this:
- Prevents random 500 errors in production
- Makes the system more robust
- Clear error messages for admins

---

## Priority 3: Add Missing Database Indexes ⚡

**Time**: 4 hours  
**Why**: Searches will get slower as hospitals grow. Fix now before you have thousands of records.

### The Issue:
Current indexes are minimal. As the database grows:
- Hospital searches take longer
- Staleness checks slow down
- Request filtering gets sluggish

### What to do:

**Step 1**: Create migration:
```bash
cd backend
python manage.py makemigrations donations --name add_missing_indexes
```

**Step 2**: Edit the migration file (look for the file just created) and add indexes:
```python
class Migration(migrations.Migration):
    dependencies = [
        ('donations', '0009_previous_migration'),  # Adjust to your latest
    ]

    operations = [
        migrations.AddIndex(
            model_name='bloodinventory',
            index=models.Index(fields=['hospital_id', 'availability_status'], name='bi_hosp_status_idx'),
        ),
        migrations.AddIndex(
            model_name='bloodinventory',
            index=models.Index(fields=['hospital_id', '-last_updated'], name='bi_hosp_updated_idx'),
        ),
        migrations.AddIndex(
            model_name='bloodinventory',
            index=models.Index(fields=['-units_available'], name='bi_units_idx'),
        ),
        migrations.AddIndex(
            model_name='bloodrequest',
            index=models.Index(fields=['requesting_hospital_id', 'status'], name='br_hosp_status_idx'),
        ),
        migrations.AddIndex(
            model_name='requestresponse',
            index=models.Index(fields=['request_id', 'responding_hospital_id'], name='rr_request_hosp_idx'),
        ),
    ]
```

**Step 3**: Apply migration:
```bash
python manage.py migrate
```

**Step 4**: Verify the indexes are created:
```bash
# In Django shell:
python manage.py shell
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT * FROM pg_indexes WHERE tablename = 'donations_bloodinventory';")
print(cursor.fetchall())
```

### How to verify:
- ✅ Migration applies without errors
- ✅ Can see indexes in database (use `\d` in psql)
- ✅ Search queries use indexes (check EXPLAIN ANALYZE)

### Why this:
- Search speed stays fast even with 10,000+ hospitals
- Staleness checks don't block
- Request filtering is snappy

---

## The Order Matters

Do them in this order:

1. **Tests first** (Days 1–2)
   - Gives you a safety net for #2 and #3
   - You'll write tests for the code you change

2. **Null hospital** (Day 3)
   - Quick win, prevents crashes
   - Tests verify the fix works

3. **Indexes** (Day 4)
   - Performance improvement
   - Non-breaking change
   - Easy to roll back if needed

---

## What's Next After This Week

Once you complete the top 3 above:

**Week 2:**
- [ ] Frontend: Auto-refresh tokens on 401 (users won't get logged out)
- [ ] Frontend: Global error toast (users see what went wrong)
- [ ] Backend: Input validation (reject negative units, out-of-bounds coordinates)

**Week 3:**
- [ ] Frontend: Centralized endpoints file (no more hardcoded URLs)
- [ ] Production settings (HTTPS, rate limiting, ALLOWED_HOSTS from env)

Then you're ready to deploy.

---

## Quick Command Reference

### Run Tests
```bash
cd backend
pytest                           # Run all tests
pytest --cov                    # With coverage report
pytest -k test_compute_status   # Run specific test
```

### Database
```bash
python manage.py migrate
python manage.py makemigrations [app_name]
python manage.py shell
```

### Django
```bash
python manage.py runserver
python manage.py createsuperuser
python manage.py seed
```

---

## Questions to Answer Before Starting

1. **How much time do you have?**
   - 1 week → Just Phase 1 (tests, indexes, validation, settings)
   - 2 weeks → Phase 1 + Phase 2 (tokens, error handling, endpoints)
   - 1 month → All three phases + documentation

2. **Who's doing this?**
   - 1 developer → 3–4 days per phase
   - 2 developers → 2 days per phase
   - 3 developers → 1–2 days per phase

3. **When should it be production-ready?**
   - ASAP → Focus on Phase 1 only
   - Next month → All phases

---

## Where to Find Help

- **CURRENT_STATE_ANALYSIS.md** — Full breakdown of all issues (read for context)
- **IMPROVEMENT_CHECKLIST.md** — Detailed checklist for each task (use while working)
- **PRIORITIES_ACTIONS.md** — Original analysis (reference)
- **CLAUDE.md** — Backend architecture and commands (reference)

---

## TL;DR - In 3 Sentences

1. Write tests (3–4 days) so you can safely improve other things
2. Fix the null hospital crash (2 hours) to prevent 500 errors
3. Add indexes (4 hours) so searches stay fast as you grow

Then you can deploy with confidence.

**Good luck! 🚀**

