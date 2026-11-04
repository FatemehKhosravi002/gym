from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ProgramViewSet

router = DefaultRouter()
router.register(r'', ProgramViewSet, basename='program')

urlpatterns = router.urls
from django.urls import path
from .views_pdf import ProgramPDFView

urlpatterns += [
    path('<int:pk>/pdf/', ProgramPDFView.as_view(), name='program-pdf'),
]
