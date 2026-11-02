from rest_framework.routers import DefaultRouter
from .views_days import ProgramDayViewSet

router = DefaultRouter()
router.register(r'', ProgramDayViewSet, basename='programday')

urlpatterns = router.urls
