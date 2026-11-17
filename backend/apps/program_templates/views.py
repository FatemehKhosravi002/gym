from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ProgramTemplate, ProgramTemplateDay, ProgramTemplateItem
from .serializers import ProgramTemplateSerializer
from apps.programs.models import Program, ProgramDay, ProgramItem
from apps.athletes.models import Athlete
from datetime import date


class ProgramTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_admin', lambda: False)() or user.is_superuser:
            return ProgramTemplate.objects.all().prefetch_related('days__items__exercise')
        return ProgramTemplate.objects.filter(coach=user).prefetch_related('days__items__exercise')

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    @action(detail=False, methods=['post'], url_path='create-from-program')
    def create_from_program(self, request):
        program_id = request.data.get('program_id')
        name = request.data.get('name')
        try:
            program = Program.objects.get(pk=program_id, coach=request.user)
        except Program.DoesNotExist:
            return Response({'detail': 'برنامه یافت نشد'}, status=404)
        template = ProgramTemplate.objects.create(name=name or f'قالب از {program.title}', coach=request.user, days_per_week=program.days_per_week)
        for day in program.days.all():
            tday = ProgramTemplateDay.objects.create(template=template, day_index=day.day_index, label=day.label)
            for item in day.items.all():
                ProgramTemplateItem.objects.create(
                    template_day=tday,
                    exercise=item.exercise,
                    order=item.order,
                    sets=item.sets,
                    reps=item.reps,
                    rest_seconds=item.rest_seconds,
                    note=item.note,
                    superset_group=item.superset_group,
                )
        return Response({'id': template.id}, status=201)

    @action(detail=True, methods=['post'], url_path='apply-to-athlete')
    def apply_to_athlete(self, request, pk=None):
        template = self.get_object()
        athlete_id = request.data.get('athlete_id')
        try:
            athlete = Athlete.objects.get(pk=athlete_id, coach=request.user)
        except Athlete.DoesNotExist:
            return Response({'detail': 'ورزشکار یافت نشد'}, status=404)
        last = Program.objects.filter(athlete=athlete).order_by('-sequence_number').first()
        seq = (last.sequence_number + 1) if last else 1
        program = Program.objects.create(
            athlete=athlete,
            coach=request.user,
            sequence_number=seq,
            title=f'برنامه از قالب {template.name}',
            start_date=date.today(),
            days_per_week=template.days_per_week,
            status='draft'
        )
        for tday in template.days.all():
            day = ProgramDay.objects.create(program=program, day_index=tday.day_index, label=tday.label)
            for item in tday.items.all():
                ProgramItem.objects.create(
                    program_day=day,
                    exercise=item.exercise,
                    order=item.order,
                    sets=item.sets,
                    reps=item.reps,
                    rest_seconds=item.rest_seconds,
                    note=item.note,
                    superset_group=item.superset_group,
                )
        return Response({'program_id': program.id}, status=201)
