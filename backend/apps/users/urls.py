from django.urls import path
from . import views
from .views_auth import RegisterView, ChangePasswordView, PendingCoachesView, ResetCoachPasswordView, CustomTokenObtainPairView, ActiveTokenRefreshView

urlpatterns = [
    path('me/', views.MeView.as_view(), name='me'),
    path('register/', RegisterView.as_view(), name='register'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('pending-coaches/', PendingCoachesView.as_view(), name='pending_coaches'),
    path('reset-coach-password/', ResetCoachPasswordView.as_view(), name='reset_coach_password'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', ActiveTokenRefreshView.as_view(), name='token_refresh'),
]
