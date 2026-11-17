from rest_framework import serializers
from .models import Program, ProgramDay, ProgramItem
from apps.athletes.serializers import AthleteSerializer
from apps.library.models import Exercise


class ProgramItemExerciseSerializer(serializers.ModelSerializer):
    """Lightweight exercise payload for program items (no per-row usage_count query)."""

    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Exercise
        fields = ['id', 'name', 'category', 'category_name', 'video_file', 'video_url', 'gif_file', 'description', 'is_active']


class ProgramItemSerializer(serializers.ModelSerializer):
    exercise_detail = ProgramItemExerciseSerializer(source='exercise', read_only=True)

    class Meta:
        model = ProgramItem
        fields = ['id', 'program_day', 'exercise', 'exercise_detail', 'order', 'sets', 'reps', 'rest_seconds', 'note', 'superset_group', 'exercise_name_snapshot']


class ProgramDaySerializer(serializers.ModelSerializer):
    items = ProgramItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProgramDay
        fields = ['id', 'program', 'day_index', 'label', 'items']


class ProgramSerializer(serializers.ModelSerializer):
    days = ProgramDaySerializer(many=True, read_only=True)
    athlete_detail = AthleteSerializer(source='athlete', read_only=True)

    class Meta:
        model = Program
        fields = ['id', 'athlete', 'athlete_detail', 'coach', 'sequence_number', 'title', 'start_date', 'days_per_week', 'notes', 'status', 'share_token', 'is_archived', 'created_at', 'updated_at', 'days']
        read_only_fields = ['coach', 'sequence_number', 'share_token']
