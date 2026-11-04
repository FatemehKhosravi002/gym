from rest_framework.routers import DefaultRouter
from .views import ProgramTemplateViewSet

router = DefaultRouter()
router.register(r'', ProgramTemplateViewSet, basename='programtemplate')

urlpatterns = router.urls
