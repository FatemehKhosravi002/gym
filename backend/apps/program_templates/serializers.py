from rest_framework import serializers
from .models import ProgramTemplate, ProgramTemplateDay, ProgramTemplateItem
from apps.library.serializers import ExerciseSerializer


class ProgramTemplateItemSerializer(serializers.ModelSerializer):
    exercise_detail = ExerciseSerializer(source='exercise', read_only=True)

    class Meta:
        model = ProgramTemplateItem
        fields = ['id', 'exercise', 'exercise_detail', 'order', 'sets', 'reps', 'rest_seconds', 'note', 'superset_group']


class ProgramTemplateDaySerializer(serializers.ModelSerializer):
    items = ProgramTemplateItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProgramTemplateDay
        fields = ['id', 'day_index', 'label', 'items']


class ProgramTemplateSerializer(serializers.ModelSerializer):
    days = ProgramTemplateDaySerializer(many=True, read_only=True)

    class Meta:
        model = ProgramTemplate
        fields = ['id', 'name', 'coach', 'days_per_week', 'description', 'created_at', 'days']
        read_only_fields = ['coach']
