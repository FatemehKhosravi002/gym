from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProgramViewSet
from .views_pdf import ProgramPDFView, PublicProgramPDFView

router = DefaultRouter()
router.register(r'', ProgramViewSet, basename='program')

# The PDF routes are listed first so ``/api/programs/public/<token>/pdf/`` can
# never be swallowed by the router's ``<pk>/`` catch-all.
urlpatterns = [
    path('public/<str:token>/pdf/', PublicProgramPDFView.as_view(), name='program-public-pdf'),
    path('<int:pk>/pdf/', ProgramPDFView.as_view(), name='program-pdf'),
] + router.urls
