from django.urls import path
from .views_pdf import ProgramPDFView

urlpatterns = [
    path('<int:pk>/pdf/', ProgramPDFView.as_view(), name='program-pdf'),
]
