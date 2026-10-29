from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ProgramViewSet

router = DefaultRouter()
router.register(r'', ProgramViewSet, basename='program')

urlpatterns = router.urls
