from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Program
from .serializers import ProgramSerializer
from .history import exercise_history
from apps.athletes.permissions import IsCoachOrAdmin
from apps.athletes.models import Athlete


def is_admin_user(user):
    return bool(user.is_staff or getattr(user, 'is_admin', lambda: False)())


class ProgramViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = Program.objects.select_related('athlete__coach', 'coach').prefetch_related('days__items__exercise__category')
        if not is_admin_user(user):
            qs = qs.filter(coach=user)
        qs = qs.filter(is_archived=False)
        deleted = (self.request.query_params.get('deleted') or '').strip() in ('1', 'true', 'yes')
        qs = qs.filter(deleted_at__isnull=not deleted)
        athlete = (self.request.query_params.get('athlete') or '').strip()
        if athlete.isdigit():
            qs = qs.filter(athlete_id=int(athlete))
        return qs

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='public/(?P<token>[^/.]+)')
    def public_share(self, request, token=None):
        program = get_object_or_404(
            Program.objects.select_related('athlete', 'coach').prefetch_related('days__items__exercise__category'),
            share_token=token,
            is_archived=False,
            deleted_at__isnull=True,
        )
        data = self.get_serializer(program).data
        data.pop('coach', None)
        data.pop('notes', None)
        athlete = data.get('athlete_detail') or {}
        data['athlete_detail'] = {
            'first_name': athlete.get('first_name'),
            'last_name': athlete.get('last_name'),
            'unique_code': athlete.get('unique_code'),
            'level': athlete.get('level'),
        }
        coach = program.coach
        data['coach_name'] = coach.get_full_name() or coach.get_username()
        return Response(data)

    @action(detail=True, methods=['post'])
    def regenerate_token(self, request, pk=None):
        """Revoke the old public link and issue a brand new one."""
        program = self.get_object()
        import secrets

        program.share_token = secrets.token_urlsafe(48)
        program.shared_at = None
        program.save(update_fields=['share_token', 'shared_at', 'updated_at'])
        return Response({'share_token': program.share_token})

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Mark the program as shared (the coach copied/sent the link)."""
        program = self.get_object()
        if not program.shared_at:
            program.shared_at = timezone.now()
            program.save(update_fields=['shared_at', 'updated_at'])
        return Response({'share_token': program.share_token, 'shared_at': program.shared_at})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Create a fresh draft copy (new sequence number + new share token)."""
        from .serializers import sync_program_days

        source = self.get_object()
        payload = []
        for day in source.days.all():
            payload.append({
                'day_index': day.day_index,
                'label': day.label,
                'items': [
                    {
                        'exercise': item.exercise_id,
                        'order': item.order,
                        'sets': item.sets,
                        'reps': item.reps,
                        'rest_seconds': item.rest_seconds,
                        'note': item.note,
                        'superset_group': item.superset_group,
                    }
                    for item in sorted(day.items.all(), key=lambda row: (row.order, row.id))
                ],
            })
        copy = Program.objects.create(
            athlete=source.athlete,
            coach=request.user,
            title=f'{source.title} (کپی)',
            start_date=source.start_date,
            days_per_week=source.days_per_week,
            notes=source.notes,
            status=Program.STATUS_DRAFT,
        )
        sync_program_days(copy, payload)
        return Response(self.get_serializer(copy).data, status=201)

    def perform_destroy(self, instance):
        """Soft delete: the program goes to trash and its public link dies."""
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.shared_at = None
        instance.save(update_fields=['deleted_at', 'deleted_by', 'shared_at', 'updated_at'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        program = get_object_or_404(Program, pk=pk, coach=request.user) if not is_admin_user(request.user) else get_object_or_404(Program, pk=pk)
        program.deleted_at = None
        program.deleted_by = None
        program.save(update_fields=['deleted_at', 'deleted_by', 'updated_at'])
        return Response(self.get_serializer(program).data)

    @action(detail=False, methods=['get'], url_path='trash')
    def trash(self, request):
        queryset = Program.objects.filter(coach=request.user, deleted_at__isnull=False).select_related('athlete') if not is_admin_user(request.user) else Program.objects.filter(deleted_at__isnull=False).select_related('athlete')
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='trash/empty')
    def empty_trash(self, request):
        queryset = Program.objects.filter(deleted_at__isnull=False)
        if not is_admin_user(request.user):
            queryset = queryset.filter(coach=request.user)
        return Response({'deleted': queryset.delete()[0]})

    @action(detail=False, methods=['get'])
    def duplicate_check(self, request):
        """Legacy coach-side check kept for older clients.

        Uses the same single query as `/api/atheletes/{id}/exercise_history/`
        (see `apps.programs.history`) so the two can never disagree.
        """
        athlete_id = (request.query_params.get('athlete_id') or '').strip()
        exercise_id = (request.query_params.get('exercise_id') or '').strip()
        exclude_program = (request.query_params.get('exclude_program') or '').strip()
        if not athlete_id.isdigit() or not exercise_id.isdigit():
            return Response({'duplicate': False, 'used': False})

        qs = Athlete.objects.filter(pk=int(athlete_id), deleted_at__isnull=True)
        if not is_admin_user(request.user):
            qs = qs.filter(coach=request.user)
        athlete = qs.first()
        if athlete is None:
            return Response({'detail': 'ورزشکار پیدا نشد.'}, status=404)

        history = exercise_history(
            athlete,
            int(exercise_id),
            int(exclude_program) if exclude_program.isdigit() else None,
        )
        if not history['count']:
            return Response({'duplicate': False, 'used': False})
        last = history['last']
        return Response({
            'duplicate': True,
            'used': True,
            'count': history['count'],
            'program_id': last['id'],
            'sequence_number': last['sequence_number'],
            'date': last['date'],
            'label': last['date_jalali'],
        })
