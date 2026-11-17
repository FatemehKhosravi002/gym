from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated
from .models import ProgramTemplateDay, ProgramTemplateItem
from apps.athletes.permissions import IsCoachOrAdmin


def is_admin_user(user):
    return getattr(user, 'is_admin', lambda: False)() or user.is_staff or user.is_superuser


class ProgramTemplateDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramTemplateDay
        fields = ['id', 'template', 'day_index', 'label']

    def validate_template(self, value):
        user = self.context['request'].user
        if not is_admin_user(user) and value.coach_id != user.id:
            raise serializers.ValidationError('این قالب متعلق به شما نیست')
        return value


class ProgramTemplateItemSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)

    class Meta:
        model = ProgramTemplateItem
        fields = ['id', 'template_day', 'exercise', 'exercise_name', 'order', 'sets', 'reps', 'rest_seconds', 'note', 'superset_group']

    def validate_template_day(self, value):
        user = self.context['request'].user
        if not is_admin_user(user) and value.template.coach_id != user.id:
            raise serializers.ValidationError('این قالب متعلق به شما نیست')
        return value


class ProgramTemplateDayViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramTemplateDaySerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filterset_fields = ['template']

    def get_queryset(self):
        qs = ProgramTemplateDay.objects.select_related('template').order_by('day_index')
        if is_admin_user(self.request.user):
            return qs
        return qs.filter(template__coach=self.request.user)


class ProgramTemplateItemViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramTemplateItemSerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filterset_fields = ['template_day']

    def get_queryset(self):
        qs = ProgramTemplateItem.objects.select_related('template_day__template', 'exercise__category')
        if is_admin_user(self.request.user):
            return qs.order_by('order')
        return qs.filter(template_day__template__coach=self.request.user).order_by('order')
