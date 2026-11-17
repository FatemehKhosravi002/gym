from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ProgramViewSet
from .views_pdf import ProgramPDFView

router = DefaultRouter()
router.register(r'', ProgramViewSet, basename='program')

urlpatterns = router.urls + [
    path('<int:pk>/pdf/', ProgramPDFView.as_view(), name='program-pdf'),
]
