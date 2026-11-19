import difflib

from django.db import IntegrityError
from django.db.models import Count, F, Max, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Athlete, AthleteCodeArchive, AthleteProfile, Measurement, normalize_persian
from .permissions import IsCoachOrAdmin
from .serializers import (
    AthleteDetailSerializer,
    AthleteSerializer,
    AthleteWriteSerializer,
    MeasurementSerializer,
)
from .serializers_profile import AthleteProfileSerializer
from apps.programs.history import exercise_history as build_exercise_history
from apps.programs.history import frequent_exercises as frequent_exercise_list
from apps.programs.history import repeat_counts as build_repeat_counts

ACTIVE_WINDOW_DAYS = 30
FUZZY_POOL_LIMIT = 800
FUZZY_CUTOFF = 0.72


class AthletePagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 60


def is_admin_user(user):
    return bool(user.is_staff or getattr(user, 'is_admin', lambda: False)())


def apply_search(qs, query):
    """Token AND search on the normalized index (ی/ي، ک/ك، ZWNJ, spaces tolerant)."""
    tokens = normalize_persian(query).split()
    for token in tokens:
        qs = qs.filter(search_index__contains=token)
    return qs


def annotate_athlete_queryset(qs):
    return qs.annotate(
        programs_count_annotated=Count('programs', distinct=True),
        measurements_count_annotated=Count('measurements', distinct=True),
        last_program_date=Max('programs__start_date'),
        last_activity=Coalesce(Max('programs__created_at'), F('created_at')),
    )


ORDERING_MAP = {
    'name': ('first_name', 'last_name'),
    '-name': ('-first_name', '-last_name'),
    'newest': ('-created_at',),
    'oldest': ('created_at',),
    'code': ('unique_code',),
    'last_program': (F('last_program_date').desc(nulls_last=True), '-created_at'),
    'last_active': (F('last_activity').desc(nulls_last=True),),
}


class AthleteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    pagination_class = AthletePagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = []

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return AthleteWriteSerializer
        if self.action == 'list':
            return AthleteSerializer
        return AthleteDetailSerializer

    def base_queryset(self):
        user = self.request.user
        qs = Athlete.objects.select_related('coach')
        if not is_admin_user(user):
            qs = qs.filter(coach=user)
        return qs

    def get_queryset(self):
        qs = self.base_queryset()
        params = self.request.query_params
        trash = self.action == 'trash' or params.get('deleted') in ('1', 'true')
        qs = qs.filter(deleted_at__isnull=not trash)
        qs = annotate_athlete_queryset(qs)

        if self.action not in ('list', 'trash', 'search_combined'):
            if self.action in ('retrieve', 'update', 'partial_update'):
                return qs.prefetch_related('measurements')
            return qs

        query = params.get('search') or params.get('q') or ''
        if query.strip():
            exact = apply_search(qs, query)
            if exact.exists():
                qs = exact
            elif len(normalize_persian(query)) >= 3:
                qs = qs.filter(pk__in=self._fuzzy_ids(query, None))
            else:
                qs = exact

        levels = [lvl for lvl in (params.get('level') or '').split(',') if lvl]
        if levels:
            qs = qs.filter(level__in=levels)
        if params.get('has_note') in ('1', 'true'):
            qs = qs.filter(Q(notes__regex=r'\S') | ~Q(note_tags=[]))
        if params.get('has_note') in ('0', 'false'):
            qs = qs.filter(notes__regex=r'^\s*$', note_tags=[])
        if params.get('has_programs') in ('1', 'true'):
            qs = qs.filter(programs_count_annotated__gt=0)
        if params.get('has_programs') in ('0', 'false'):
            qs = qs.filter(programs_count_annotated=0)
        if params.get('active') in ('1', 'true'):
            since = timezone.now() - timezone.timedelta(days=ACTIVE_WINDOW_DAYS)
            qs = qs.filter(last_activity__gte=since)

        order = ORDERING_MAP.get(params.get('ordering') or 'newest', ORDERING_MAP['newest'])
        return qs.order_by(*order)

    def _with_annotations(self, athlete_id):
        return annotate_athlete_queryset(self.base_queryset()).filter(pk=athlete_id).first()

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = AthleteWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        athlete = serializer.save(coach=request.user)
        return Response(AthleteDetailSerializer(athlete, context={'request': request}).data, status=201)

    def update(self, request, *args, **kwargs):
        athlete = self.get_object()
        serializer = AthleteWriteSerializer(athlete, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AthleteDetailSerializer(athlete, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        athlete = self.get_object()
        athlete.deleted_at = timezone.now()
        athlete.deleted_by = request.user
        athlete.save(update_fields=['deleted_at', 'deleted_by', 'search_index'])
        return Response({'status': 'deleted', 'restorable': True})

    def _deleted_queryset(self):
        return self.base_queryset().filter(deleted_at__isnull=False)

    @action(detail=False, methods=['get'])
    def trash(self, request):
        qs = annotate_athlete_queryset(self._deleted_queryset()).order_by('-deleted_at')
        page = self.paginate_queryset(qs)
        data = AthleteSerializer(page, many=True).data
        return self.get_paginated_response(data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        athlete = self._deleted_queryset().filter(pk=pk).first()
        if not athlete:
            return Response({'detail': 'ورزشکار حذف‌شده‌ای با این شناسه پیدا نشد.'}, status=404)
        athlete.deleted_at = None
        athlete.deleted_by = None
        athlete.save(update_fields=['deleted_at', 'deleted_by', 'search_index'])
        return Response(AthleteDetailSerializer(athlete).data)

    @action(detail=True, methods=['post'], url_path='purge')
    def purge(self, request, pk=None):
        athlete = self._deleted_queryset().filter(pk=pk).first()
        if not athlete:
            return Response({'detail': 'ابتدا ورزشکار را به سطل زباله ببرید.'}, status=400)
        if athlete.programs.exists():
            return Response(
                {'detail': 'این ورزشکار برنامه دارد و برای همیشه حذف نمی‌شود. برنامه‌ها را اول حذف کنید.'},
                status=400,
            )
        code = (request.data.get('confirm_code') or '').strip()
        if code != athlete.unique_code:
            return Response({'confirm_code': 'کد ورزشکار را دقیقاً وارد کنید.'}, status=400)
        AthleteCodeArchive.objects.get_or_create(code=athlete.unique_code,
                                                 defaults={'athlete_name': athlete.full_name})
        athlete.delete()
        return Response({'status': 'purged'}, status=204)

    @action(detail=False, methods=['get'])
    def search_combined(self, request):
        query = (request.query_params.get('q') or '').strip()
        if not query:
            return Response([])
        qs = self.get_queryset()
        limit = min(int(request.query_params.get('limit') or 20), 50)
        rows = list(qs[:limit])
        if not rows and len(normalize_persian(query)) >= 3:
            rows = self._fuzzy_matches(query, limit)
        return Response(AthleteSerializer(rows, many=True).data)

    def _fuzzy_ids(self, query, limit):
        needle = normalize_persian(query)
        pool = self.base_queryset().filter(deleted_at__isnull=True).values('id', 'search_index')[:FUZZY_POOL_LIMIT]
        scored = []
        for row in pool:
            haystack = row['search_index'] or ''
            if not haystack:
                continue
            score = max(
                difflib.SequenceMatcher(None, needle, haystack).ratio(),
                difflib.SequenceMatcher(None, needle, haystack.replace(' ', '')).ratio(),
                max((difflib.SequenceMatcher(None, token, part).ratio()
                     for token in needle.split() for part in haystack.split()), default=0),
            )
            if score >= FUZZY_CUTOFF:
                scored.append((score, row['id']))
        scored.sort(reverse=True)
        return [row_id for _, row_id in scored[:limit or 50]]

    def _fuzzy_matches(self, query, limit):
        """Cheap typo tolerance over the coach's own (already normalized) rows."""
        needle = normalize_persian(query)
        pool = self.base_queryset().filter(deleted_at__isnull=True).values('id', 'search_index')[:FUZZY_POOL_LIMIT]
        scored = []
        for row in pool:
            haystack = row['search_index'] or ''
            if not haystack:
                continue
            score = max(
                difflib.SequenceMatcher(None, needle, haystack).ratio(),
                difflib.SequenceMatcher(None, needle, haystack.replace(' ', '')).ratio(),
                max((difflib.SequenceMatcher(None, token, part).ratio()
                     for token in needle.split() for part in haystack.split()), default=0),
            )
            if score >= FUZZY_CUTOFF:
                scored.append((score, row['id']))
        scored.sort(reverse=True)
        ids = [row_id for _, row_id in scored[:limit]]
        if not ids:
            return []
        found = annotate_athlete_queryset(self.base_queryset().filter(id__in=ids))
        by_id = {a.id: a for a in found}
        return [by_id[i] for i in ids if i in by_id]

    @action(detail=True, methods=['get', 'post'])
    def profile(self, request, pk=None):
        athlete = self.get_object()
        profile, _ = AthleteProfile.objects.get_or_create(athlete=athlete)
        if request.method == 'POST':
            serializer = AthleteProfileSerializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(AthleteProfileSerializer(profile).data)

    def _measurement_queryset(self, athlete):
        return Measurement.objects.filter(athlete=athlete, deleted_at__isnull=True)

    @action(detail=True, methods=['get', 'post'])
    def measurements(self, request, pk=None):
        athlete = self.get_object()
        if request.method == 'POST':
            payload = request.data.copy()
            payload['athlete'] = athlete.id
            serializer = MeasurementSerializer(data=payload, context={'athlete': athlete})
            serializer.is_valid(raise_exception=True)
            try:
                measurement = serializer.save(athlete=athlete)
            except IntegrityError:
                return Response(
                    {'date': 'برای این روز قبلاً اندازه‌گیری ثبت شده است. همان را ویرایش کنید.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(MeasurementSerializer(measurement).data, status=status.HTTP_201_CREATED)
        qs = self._measurement_queryset(athlete).order_by('date', 'id')
        return Response(MeasurementSerializer(qs, many=True).data)

    @action(detail=True, methods=['get', 'patch', 'delete'],
            url_path='measurements/(?P<m_id>[0-9]+)')
    def measurement_detail(self, request, pk=None, m_id=None):
        athlete = self.get_object()
        measurement = self._measurement_queryset(athlete).filter(pk=m_id).first()
        if not measurement:
            return Response({'detail': 'این اندازه‌گیری پیدا نشد.'}, status=404)
        if request.method == 'DELETE':
            measurement.deleted_at = timezone.now()
            measurement.deleted_by = request.user
            measurement.save(update_fields=['deleted_at', 'deleted_by'])
            return Response(status=status.HTTP_204_NO_CONTENT)
        if request.method == 'PATCH':
            payload = request.data.copy()
            payload.pop('athlete', None)
            serializer = MeasurementSerializer(measurement, data=payload, partial=True, context={'athlete': athlete})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(MeasurementSerializer(measurement).data)
        return Response(MeasurementSerializer(measurement).data)

    @action(detail=True, methods=['post'], url_path='measurements/(?P<m_id>[0-9]+)/delete')
    def measurement_delete(self, request, pk=None, m_id=None):
        return self.measurement_detail(request, pk=pk, m_id=m_id)

    @action(detail=True, methods=['get'], url_path='exercise_history')
    def exercise_history(self, request, pk=None):
        """Repeat history for one exercise: how often the student already did it.

        `?exercise_id=X&exclude_program=Y` -> {count, last, programs: [...]}, newest first.
        Drafts and final programmes count, archived (soft-deleted) ones do not.
        """
        athlete = self.get_object()
        raw_exercise = (request.query_params.get('exercise_id') or '').strip()
        raw_exclude = (request.query_params.get('exclude_program') or '').strip()
        if not raw_exercise.isdigit():
            return Response({'detail': 'exercise_id لازم است.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(build_exercise_history(
            athlete,
            int(raw_exercise),
            int(raw_exclude) if raw_exclude.isdigit() else None,
        ))

    @action(detail=True, methods=['get'], url_path='frequent_exercises')
    def frequent_exercises(self, request, pk=None):
        """Top 10 exercises of a student, for the «حرکات پرتکرار» section."""
        athlete = self.get_object()
        return Response({'exercises': frequent_exercise_list(athlete)})

    @action(detail=True, methods=['get'], url_path='repeat_counts')
    def repeat_counts(self, request, pk=None):
        """`?exercise_ids=1,2,3` -> {counts: {"1": 10, ...}} for «تکرار ×۱۰» badges."""
        athlete = self.get_object()
        raw = (request.query_params.get('exercise_ids') or '').replace(' ', '')
        ids = [int(part) for part in raw.split(',') if part.isdigit()]
        raw_exclude = (request.query_params.get('exclude_program') or '').strip()
        counts = build_repeat_counts(
            athlete,
            ids or None,
            int(raw_exclude) if raw_exclude.isdigit() else None,
        )
        return Response({'counts': {str(key): value for key, value in counts.items()}})

