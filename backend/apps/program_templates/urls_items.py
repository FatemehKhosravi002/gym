from rest_framework.routers import DefaultRouter
from .views_days import ProgramTemplateItemViewSet

router = DefaultRouter()
router.register(r'', ProgramTemplateItemViewSet, basename='programtemplateitem')

urlpatterns = router.urls
