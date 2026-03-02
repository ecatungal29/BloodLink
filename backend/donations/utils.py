import math


def haversine_km(lat1, lon1, lat2, lon2):
    """Return the great-circle distance in km between two lat/lon points."""
    R = 6371
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(float(lat1)))
        * math.cos(math.radians(float(lat2)))
        * math.sin(dlon / 2) ** 2
    )
    return round(2 * R * math.asin(math.sqrt(a)), 2)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(user, action_type, entity_type, entity_id=None, request=None, metadata=None):
    """Create an AuditLog entry. Import lazily to avoid circular imports."""
    from .models import AuditLog
    AuditLog.objects.create(
        user=user,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=get_client_ip(request) if request else None,
        metadata=metadata or {},
    )


BLOOD_TYPE_COMPATIBILITY = {
    # recipient → compatible donor types (for RBC)
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
}
