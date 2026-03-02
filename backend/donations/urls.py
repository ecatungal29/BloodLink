from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'hospitals', views.HospitalViewSet, basename='hospitals')
router.register(r'inventory', views.BloodInventoryViewSet, basename='inventory')
router.register(r'requests', views.BloodRequestViewSet, basename='requests')
router.register(r'responses', views.RequestResponseViewSet, basename='responses')
router.register(r'audit', views.AuditLogViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
    path('search/', views.SearchHospitalsView.as_view(), name='search-hospitals'),
]
