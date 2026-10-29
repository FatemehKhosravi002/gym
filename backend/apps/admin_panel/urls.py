from django.urls import path
from . import views

urlpatterns = [
    path('overview/', views.OverviewView.as_view(), name='admin_overview'),
    path('settings/', views.SettingsView.as_view(), name='admin_settings'),
    path('coaches/', views.CoachesListView.as_view(), name='admin_coaches'),
    path('coaches/<int:pk>/action/', views.CoachActionView.as_view(), name='admin_coach_action'),
    path('coaches/<int:pk>/view/', views.CoachDetailView.as_view(), name='admin_coach_detail'),
]
