from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'register', views.RegisterViewSet, basename='register')
router.register(r'profile', views.ProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshTokenView.as_view(), name='token_refresh'),
    path('google/', views.GoogleLoginView.as_view(), name='google_login'),
    path('google', views.GoogleLoginView.as_view(), name='google_login_noslash'),
]
