from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Athlete
from .serializers import AthleteSerializer
from .permissions import IsCoachOrAdmin


class AthleteViewSet(viewsets.ModelViewSet):
    serializer_class = AthleteSerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'unique_code']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_admin', lambda: False)() or user.is_staff:
            return Athlete.objects.all()
        return Athlete.objects.filter(coach=user)

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    @action(detail=False, methods=['get'])
    def search_combined(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])
        # Search across first_name, last_name, unique_code with simple contains
        qs = self.get_queryset().filter(
            Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(unique_code__icontains=q)
        )
        serializer = self.get_serializer(qs[:20], many=True)
        return Response(serializer.data)
