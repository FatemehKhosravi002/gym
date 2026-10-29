from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ExerciseViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'exercises', ExerciseViewSet, basename='exercise')

urlpatterns = router.urls
