from rest_framework.routers import DefaultRouter
from .views import AthleteViewSet

router = DefaultRouter()
router.register(r'', AthleteViewSet, basename='athlete')

urlpatterns = router.urls
