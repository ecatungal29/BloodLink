from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'requests', views.BloodRequestViewSet, basename='blood-requests')
router.register(r'donations', views.DonationViewSet, basename='donations')
router.register(r'inventory', views.BloodInventoryViewSet, basename='inventory')
router.register(r'centers', views.DonationCenterViewSet, basename='centers')

urlpatterns = [
    path('', include(router.urls)),
    path('search-donors/', views.SearchDonorsView.as_view(), name='search-donors'),
    path('match/<int:request_id>/', views.MatchDonorsView.as_view(), name='match-donors'),
]
