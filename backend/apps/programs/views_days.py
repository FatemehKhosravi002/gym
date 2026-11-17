from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated
from .models import ProgramDay, ProgramItem
from apps.athletes.permissions import IsCoachOrAdmin


def is_admin_user(user):
    return getattr(user, 'is_admin', lambda: False)() or user.is_staff or user.is_superuser


class ProgramDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramDay
        fields = ['id', 'program', 'day_index', 'label']

    def validate_program(self, value):
        user = self.context['request'].user
        if not is_admin_user(user) and value.coach_id != user.id:
            raise serializers.ValidationError('این برنامه متعلق به شما نیست')
        return value


class ProgramItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramItem
        fields = ['id', 'program_day', 'exercise', 'order', 'sets', 'reps', 'rest_seconds', 'note', 'superset_group']

    def validate_program_day(self, value):
        user = self.context['request'].user
        if not is_admin_user(user) and value.program.coach_id != user.id:
            raise serializers.ValidationError('این برنامه متعلق به شما نیست')
        return value


class ProgramDayViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramDaySerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filterset_fields = ['program']

    def get_queryset(self):
        qs = ProgramDay.objects.select_related('program').order_by('day_index')
        if is_admin_user(self.request.user):
            return qs
        return qs.filter(program__coach=self.request.user)


class ProgramItemViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramItemSerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filterset_fields = ['program_day']

    def get_queryset(self):
        qs = ProgramItem.objects.select_related('program_day__program', 'exercise')
        if is_admin_user(self.request.user):
            return qs.order_by('order')
        return qs.filter(program_day__program__coach=self.request.user).order_by('order')
