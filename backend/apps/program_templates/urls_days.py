from rest_framework.routers import DefaultRouter
from .views_days import ProgramTemplateDayViewSet

router = DefaultRouter()
router.register(r'', ProgramTemplateDayViewSet, basename='programtemplateday')

urlpatterns = router.urls
