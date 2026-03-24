from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from .models import Hospital, BloodInventory, BloodRequest, RequestResponse, AuditLog
from .serializers import (
    HospitalSerializer,
    BloodInventorySerializer,
    BloodRequestSerializer,
    RequestResponseSerializer,
    AuditLogSerializer,
    HospitalSearchResultSerializer,
)
from .utils import haversine_km, log_action
from accounts.permissions import IsSuperAdmin, IsHospitalAdmin, IsStaffOrAbove

User = get_user_model()


class HospitalViewSet(viewsets.ModelViewSet):
    """
    List / retrieve: any authenticated user.
    Create / update / delete: super_admin only.
    """
    serializer_class = HospitalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Hospital.objects.filter(is_active=True).order_by('name')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsSuperAdmin()]
        if self.action == 'list':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        hospital = serializer.save()
        log_action(
            user=self.request.user,
            action_type='hospital_create',
            entity_type='Hospital',
            entity_id=hospital.id,
            request=self.request,
        )

    def perform_update(self, serializer):
        hospital = serializer.save()
        log_action(
            user=self.request.user,
            action_type='hospital_update',
            entity_type='Hospital',
            entity_id=hospital.id,
            request=self.request,
        )


class BloodInventoryViewSet(viewsets.ModelViewSet):
    """
    List / retrieve: any authenticated user.
    Create / update / delete: staff or above, scoped to their hospital.
    super_admin can manage any hospital's inventory.
    """
    serializer_class = BloodInventorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = BloodInventory.objects.select_related('hospital')

        if not user.is_super_admin and user.hospital:
            qs = qs.filter(hospital=user.hospital)

        # Optional filters via query params
        component = self.request.query_params.get('component_type')
        abo = self.request.query_params.get('abo_type')
        rh = self.request.query_params.get('rh_type')
        hospital_id = self.request.query_params.get('hospital')

        if component:
            qs = qs.filter(component_type=component)
        if abo:
            qs = qs.filter(abo_type=abo)
        if rh:
            qs = qs.filter(rh_type=rh)
        if hospital_id:
            qs = qs.filter(hospital_id=hospital_id)

        return qs.order_by('hospital__name', 'component_type', 'abo_type', 'rh_type')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsStaffOrAbove()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        # Non-super_admin users can only create for their own hospital
        user = self.request.user
        if not user.is_super_admin:
            serializer.validated_data['hospital'] = user.hospital
        inventory = serializer.save()
        log_action(
            user=user,
            action_type='inventory_create',
            entity_type='BloodInventory',
            entity_id=inventory.id,
            request=self.request,
            metadata={
                'hospital_id': inventory.hospital_id,
                'component_type': inventory.component_type,
                'abo_type': inventory.abo_type,
                'rh_type': inventory.rh_type,
                'units_available': inventory.units_available,
            },
        )

    def perform_update(self, serializer):
        inventory = serializer.save()
        log_action(
            user=self.request.user,
            action_type='inventory_update',
            entity_type='BloodInventory',
            entity_id=inventory.id,
            request=self.request,
            metadata={
                'units_available': inventory.units_available,
                'availability_status': inventory.availability_status,
            },
        )

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Aggregate view: all blood types across all hospitals."""
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class BloodRequestViewSet(viewsets.ModelViewSet):
    """
    List: all open requests visible to any authenticated user.
    Create: staff or above, auto-assigned to their hospital.
    Update status: hospital_admin or above for their hospital; super_admin for all.
    """
    serializer_class = BloodRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = BloodRequest.objects.select_related(
            'requesting_hospital', 'created_by'
        ).prefetch_related('responses')

        status_filter = self.request.query_params.get('status')
        hospital_id = self.request.query_params.get('hospital')
        urgency = self.request.query_params.get('urgency_level')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if hospital_id:
            qs = qs.filter(requesting_hospital_id=hospital_id)
        if urgency:
            qs = qs.filter(urgency_level=urgency)

        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsStaffOrAbove()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        hospital = user.hospital if not user.is_super_admin else serializer.validated_data.get('requesting_hospital')
        blood_request = serializer.save(requesting_hospital=hospital, created_by=user)
        log_action(
            user=user,
            action_type='request_create',
            entity_type='BloodRequest',
            entity_id=blood_request.id,
            request=self.request,
            metadata={
                'requesting_hospital_id': blood_request.requesting_hospital_id,
                'component_type': blood_request.component_type,
                'abo_type': blood_request.abo_type,
                'rh_type': blood_request.rh_type,
                'urgency_level': blood_request.urgency_level,
            },
        )

    def perform_update(self, serializer):
        blood_request = serializer.save()
        log_action(
            user=self.request.user,
            action_type='request_update',
            entity_type='BloodRequest',
            entity_id=blood_request.id,
            request=self.request,
            metadata={'status': blood_request.status},
        )

    @action(detail=True, methods=['patch'])
    def close(self, request, pk=None):
        """Close a fulfilled or abandoned request."""
        blood_request = self.get_object()
        blood_request.status = 'closed'
        blood_request.save()
        log_action(
            user=request.user,
            action_type='request_close',
            entity_type='BloodRequest',
            entity_id=blood_request.id,
            request=request,
        )
        return Response(self.get_serializer(blood_request).data)

    @action(detail=True, methods=['patch'])
    def fulfill(self, request, pk=None):
        """Mark a request as fulfilled."""
        blood_request = self.get_object()
        blood_request.status = 'fulfilled'
        blood_request.save()
        log_action(
            user=request.user,
            action_type='request_fulfill',
            entity_type='BloodRequest',
            entity_id=blood_request.id,
            request=request,
        )
        return Response(self.get_serializer(blood_request).data)


class RequestResponseViewSet(viewsets.ModelViewSet):
    """
    Hospitals respond to blood requests here.
    Each hospital can only respond once per request (enforced by unique_together).
    """
    serializer_class = RequestResponseSerializer
    permission_classes = [IsStaffOrAbove]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = RequestResponse.objects.select_related(
            'request', 'responding_hospital', 'responded_by'
        )
        request_id = self.request.query_params.get('request')
        if request_id:
            qs = qs.filter(request_id=request_id)
        if not user.is_super_admin and user.hospital:
            qs = qs.filter(responding_hospital=user.hospital)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        hospital = user.hospital if not user.is_super_admin else serializer.validated_data.get('responding_hospital')
        response = serializer.save(responding_hospital=hospital, responded_by=user)
        log_action(
            user=user,
            action_type='response_submit',
            entity_type='RequestResponse',
            entity_id=response.id,
            request=self.request,
            metadata={
                'request_id': response.request_id,
                'response_status': response.response_status,
            },
        )


class SearchHospitalsView(APIView):
    """
    Search for hospitals with available inventory matching the given criteria.
    Results are sorted by proximity when lat/lon are provided.

    Query params:
      - component_type (required): RBC | Platelets | Plasma
      - abo_type (required):       A | B | AB | O
      - rh_type (required):        + | -
      - lat / lon (optional):      requester coords for distance sorting
      - min_units (optional):      minimum units_available filter (default 1)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        component_type = request.query_params.get('component_type')
        abo_type = request.query_params.get('abo_type')
        rh_type = request.query_params.get('rh_type')

        if not all([component_type, abo_type, rh_type]):
            return Response(
                {'error': 'component_type, abo_type, and rh_type are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            min_units = int(request.query_params.get('min_units', 1))
        except ValueError:
            min_units = 1

        inventory_qs = (
            BloodInventory.objects
            .filter(
                component_type=component_type,
                abo_type=abo_type,
                rh_type=rh_type,
                units_available__gte=min_units,
                hospital__is_active=True,
            )
            .select_related('hospital')
            .exclude(availability_status='none')
        )

        # Build a map of hospital_id → inventory record for the serializer
        matched_inventory = {inv.hospital_id: inv for inv in inventory_qs}
        hospitals = list(Hospital.objects.filter(id__in=matched_inventory.keys()))

        # Geo-sort if caller supplies coordinates
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        if lat and lon:
            try:
                lat, lon = float(lat), float(lon)
                for h in hospitals:
                    if h.latitude and h.longitude:
                        h.distance_km = haversine_km(lat, lon, h.latitude, h.longitude)
                    else:
                        h.distance_km = None
                hospitals.sort(key=lambda h: (h.distance_km is None, h.distance_km or 0))
            except (ValueError, TypeError):
                pass  # silently skip sorting if coords are malformed

        log_action(
            user=request.user,
            action_type='search_hospitals',
            entity_type='BloodInventory',
            request=request,
            metadata={
                'component_type': component_type,
                'abo_type': abo_type,
                'rh_type': rh_type,
                'results_count': len(hospitals),
            },
        )

        serializer = HospitalSearchResultSerializer(
            hospitals,
            many=True,
            context={'matched_inventory': matched_inventory},
        )
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit trail. super_admin only."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = AuditLog.objects.select_related('user')
        action_type = self.request.query_params.get('action_type')
        entity_type = self.request.query_params.get('entity_type')
        user_id = self.request.query_params.get('user')
        if action_type:
            qs = qs.filter(action_type=action_type)
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs
