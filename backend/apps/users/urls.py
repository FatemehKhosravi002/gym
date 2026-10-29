from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MeView.as_view(), name='me'),
]
from django.urls import path
from . import views_auth

urlpatterns += [
    path('register/', views_auth.RegisterView.as_view(), name='register'),
    path('change-password/', views_auth.ChangePasswordView.as_view(), name='change_password'),
    path('pending-coaches/', views_auth.PendingCoachesView.as_view(), name='pending_coaches'),
    path('reset-coach-password/', views_auth.ResetCoachPasswordView.as_view(), name='reset_coach_password'),
]
from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MeView.as_view(), name='me'),
]
from . import views_auth

urlpatterns += [
    path('register/', views_auth.RegisterView.as_view(), name='register'),
    path('change-password/', views_auth.ChangePasswordView.as_view(), name='change_password'),
    path('pending-coaches/', views_auth.PendingCoachesView.as_view(), name='pending_coaches'),
    path('reset-coach-password/', views_auth.ResetCoachPasswordView.as_view(), name='reset_coach_password'),
]
from .views_auth import CustomTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns += [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
