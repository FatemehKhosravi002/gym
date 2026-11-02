from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ProgramViewSet
from .views_days import ProgramDayViewSet, ProgramItemViewSet

router = DefaultRouter()
router.register(r'', ProgramViewSet, basename='program')
router.register(r'../program-days', ProgramDayViewSet, basename='programday')
router.register(r'../program-items', ProgramItemViewSet, basename='programitem')
