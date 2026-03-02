from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'super_admin'


class IsHospitalAdmin(BasePermission):
    """super_admin or hospital_admin."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ('super_admin', 'hospital_admin')
        )


class IsStaffOrAbove(BasePermission):
    """super_admin, hospital_admin, or staff — can make changes."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_edit


class IsAuthenticatedViewer(BasePermission):
    """Any authenticated user (viewer and above)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated


class BelongsToHospital(BasePermission):
    """Object-level: user must belong to the same hospital as the object."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'super_admin':
            return True
        hospital = getattr(obj, 'hospital', None) or getattr(obj, 'requesting_hospital', None)
        return hospital and hospital == request.user.hospital
