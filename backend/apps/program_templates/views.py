from datetime import date

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.athletes.models import Athlete
from apps.athletes.permissions import IsCoachOrAdmin
from apps.programs.history import repeat_counts
from apps.programs.models import Program, ProgramDay, ProgramItem
from apps.programs.serializers import ProgramSerializer

from .models import ProgramTemplate, ProgramTemplateDay, ProgramTemplateItem
from .serializers import ProgramTemplateSerializer


def is_admin_user(user):
    return bool(user.is_staff or getattr(user, 'is_admin', lambda: False)())


def item_fields(item):
    """Shared payload when copying programme rows into template rows (and back)."""
    return {
        'exercise': item.exercise,
        'order': item.order,
        'sets': item.sets,
        'reps': item.reps,
        'rest_seconds': item.rest_seconds,
        'note': item.note,
        'superset_group': item.superset_group,
    }


class ProgramTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramTemplateSerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = ProgramTemplate.objects.prefetch_related('days__items__exercise')
        if not is_admin_user(user):
            qs = qs.filter(coach=user)
        show_deleted = (self.request.query_params.get('deleted') or '').strip() in ('1', 'true', 'yes')
        qs = qs.filter(deleted_at__isnull=not show_deleted)
        return qs

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Soft delete so «واگرد» in the toast can restore the template."""
        template = self.get_object()
        template.deleted_at = timezone.now()
        template.deleted_by = request.user
        template.save(update_fields=['deleted_at', 'deleted_by'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        template = get_object_or_404(ProgramTemplate, pk=pk)
        if not is_admin_user(request.user) and template.coach_id != request.user.id:
            return Response({'detail': 'این قالب متعلق به شما نیست'}, status=404)
        template.deleted_at = None
        template.deleted_by = None
        template.save(update_fields=['deleted_at', 'deleted_by'])
        return Response(self.get_serializer(template).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Independent deep copy; later edits never leak between the two."""
        source = self.get_object()
        template = ProgramTemplate.objects.create(
            name=(request.data.get('name') or '').strip() or f'کپی {source.name}',
            coach=request.user,
            days_per_week=source.days_per_week,
            description=source.description,
        )
        for day in source.days.all():
            copy_day = ProgramTemplateDay.objects.create(
                template=template, day_index=day.day_index, label=day.label,
            )
            ProgramTemplateItem.objects.bulk_create([
                ProgramTemplateItem(template_day=copy_day, **item_fields(item))
                for item in day.items.all()
            ])
        return Response(self.get_serializer(template).data, status=status.HTTP_201_CREATED)


    @action(detail=False, methods=['post'], url_path='create-from-program')
    def create_from_program(self, request):
        """«ذخیره به‌عنوان قالب» — copies the whole programme structure."""
        program_id = request.data.get('program_id')
        program = Program.objects.filter(pk=program_id, deleted_at__isnull=True, is_archived=False).first()
        if program is None or (not is_admin_user(request.user) and program.coach_id != request.user.id):
            return Response({'detail': 'برنامه یافت نشد'}, status=404)

        name = (request.data.get('name') or '').strip() or f'قالب از {program.title}'
        template = ProgramTemplate.objects.create(
            name=name[:200],
            coach=request.user,
            days_per_week=program.days_per_week,
            description=program.notes,
        )
        for day in program.days.all():
            copy_day = ProgramTemplateDay.objects.create(
                template=template, day_index=day.day_index, label=day.label,
            )
            ProgramTemplateItem.objects.bulk_create([
                ProgramTemplateItem(template_day=copy_day, **item_fields(item))
                for item in day.items.all()
            ])
        return Response(self.get_serializer(template).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='apply-to-athlete')
    def apply_to_athlete(self, request, pk=None):
        """Create an independent draft programme for one student from this template.

        Returns the serialized draft plus per-item hints the builder needs:
        ``is_disabled`` (offer «جایگزینی») and ``repeat_count`` (highlight
        «در N برنامه بوده»).
        """
        template = self.get_object()
        athlete = Athlete.objects.filter(
            pk=request.data.get('athlete_id'), deleted_at__isnull=True,
        ).first()
        if athlete is None or (not is_admin_user(request.user) and athlete.coach_id != request.user.id):
            return Response({'detail': 'ورزشکار یافت نشد'}, status=404)

        title = (request.data.get('title') or '').strip() or f'برنامه از قالب {template.name}'
        start_date = request.data.get('start_date') or date.today().isoformat()
        days_per_week = max(
            template.days_per_week,
            max((day.day_index for day in template.days.all()), default=0),
        )
        program = Program.objects.create(
            athlete=athlete,
            coach=request.user,
            title=title[:200],
            start_date=start_date,
            days_per_week=days_per_week,
            status=Program.STATUS_DRAFT,
        )

        item_hints = []
        for template_day in template.days.all():
            day = ProgramDay.objects.create(
                program=program, day_index=template_day.day_index, label=template_day.label,
            )
            for template_item in template_day.items.all():
                program_item = ProgramItem.objects.create(
                    program_day=day, **item_fields(template_item),
                )
                item_hints.append({
                    'program_item_id': program_item.id,
                    'template_item_id': template_item.id,
                    'template_day_id': template_day.id,
                    'day_index': template_day.day_index,
                    'exercise': program_item.exercise_id,
                    'exercise_name': program_item.exercise.name,
                    'is_disabled': not program_item.exercise.is_active,
                })

        counts = repeat_counts(
            athlete,
            [hint['exercise'] for hint in item_hints] or None,
            exclude_program=program.id,
        )
        for hint in item_hints:
            hint['repeat_count'] = counts.get(hint['exercise'], 0)

        return Response({
            'program_id': program.id,
            'program': ProgramSerializer(program).data,
            'items': item_hints,
            'has_disabled_exercises': any(hint['is_disabled'] for hint in item_hints),
            'has_history': any(hint['repeat_count'] > 0 for hint in item_hints),
        }, status=status.HTTP_201_CREATED)

