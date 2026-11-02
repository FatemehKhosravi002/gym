from rest_framework.routers import DefaultRouter
from .views_days import ProgramItemViewSet

router = DefaultRouter()
router.register(r'', ProgramItemViewSet, basename='programitem')

urlpatterns = router.urls
