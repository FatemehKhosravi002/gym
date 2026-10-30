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


from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AthleteProfile, Measurement
from .serializers_profile import AthleteProfileSerializer, MeasurementSerializer
from django.utils import timezone


class ProfileMixin:
    @action(detail=True, methods=['get', 'post'])
    def profile(self, request, pk=None):
        athlete = self.get_object()
        if request.method == 'POST':
            profile, _ = AthleteProfile.objects.get_or_create(athlete=athlete)
            serializer = AthleteProfileSerializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        profile, _ = AthleteProfile.objects.get_or_create(athlete=athlete)
        serializer = AthleteProfileSerializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def measurements(self, request, pk=None):
        athlete = self.get_object()
        if request.method == 'POST':
            data = request.data.copy()
            data['athlete'] = athlete.id
            serializer = MeasurementSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            m = serializer.save()
            # update profile
            profile, _ = AthleteProfile.objects.get_or_create(athlete=athlete)
            profile.weight_kg = m.weight_kg
            if m.height_cm:
                profile.height_cm = m.height_cm
            if m.level:
                profile.level = m.level
            profile.save()
            return Response(serializer.data, status=201)
        qs = Measurement.objects.filter(athlete=athlete, deleted_at__isnull=True).order_by('-date')
        serializer = MeasurementSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='measurements/(?P<m_id>[^/.]+)/delete')
    def measurement_delete(self, request, pk=None, m_id=None):
        athlete = self.get_object()
        try:
            m = Measurement.objects.get(pk=m_id, athlete=athlete)
        except Measurement.DoesNotExist:
            return Response({'detail': 'یافت نشد'}, status=404)
        m.deleted_at = timezone.now()
        m.deleted_by = request.user
        m.save()
        return Response({'status': 'deleted'})


class AthleteViewSet(AthleteViewSet, ProfileMixin):
    pass
