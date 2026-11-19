from rest_framework import serializers

from .models import ProgramTemplate, ProgramTemplateDay, ProgramTemplateItem


class ProgramTemplateItemSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)
    exercise_is_active = serializers.BooleanField(source='exercise.is_active', read_only=True)

    class Meta:
        model = ProgramTemplateItem
        fields = [
            'id', 'exercise', 'exercise_name', 'exercise_is_active', 'order',
            'sets', 'reps', 'rest_seconds', 'note', 'superset_group',
        ]


class ProgramTemplateDaySerializer(serializers.ModelSerializer):
    items = ProgramTemplateItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProgramTemplateDay
        fields = ['id', 'day_index', 'label', 'items']


class ProgramTemplateSerializer(serializers.ModelSerializer):
    days = ProgramTemplateDaySerializer(many=True, read_only=True)
    days_count = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = ProgramTemplate
        fields = [
            'id', 'name', 'coach', 'days_per_week', 'description',
            'created_at', 'updated_at', 'days_count', 'items_count', 'days',
        ]
        read_only_fields = ['coach', 'created_at', 'updated_at']

    def get_days_count(self, obj):
        return len(obj.days.all())  # prefetched: no extra query

    def get_items_count(self, obj):
        return sum(len(day.items.all()) for day in obj.days.all())

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('نام قالب الزامی است')
        if len(value) > 200:
            raise serializers.ValidationError('نام قالب نباید بیشتر از ۲۰۰ کاراکتر باشد')
        return value

