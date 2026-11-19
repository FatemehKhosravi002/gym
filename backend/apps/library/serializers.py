from rest_framework import serializers

from .models import Category, Exercise
from .utils import normalize_persian


class CategorySerializer(serializers.ModelSerializer):
    exercise_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'order', 'is_active', 'exercise_count']

    def get_exercise_count(self, obj):
        # Counts disabled exercises too: the card must explain what is inside.
        return obj.exercises.count()

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('نام دسته‌بندی الزامی است')
        if len(value) > 50:
            raise serializers.ValidationError('نام دسته‌بندی نباید بیشتر از ۵۰ کاراکتر باشد')
        norm = normalize_persian(value)
        for existing in Category.objects.all():
            if self.instance and existing.pk == self.instance.pk:
                continue
            if normalize_persian(existing.name) == norm:
                raise serializers.ValidationError('این نام دسته‌بندی قبلاً ثبت شده است')
        return value


class ExerciseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_is_active = serializers.BooleanField(source='category.is_active', read_only=True)
    usage_count = serializers.SerializerMethodField()
    usage_count_items = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            'id', 'name', 'category', 'category_name', 'category_is_active',
            'video_file', 'video_url', 'gif_file', 'description', 'is_active',
            'created_at', 'usage_count', 'usage_count_items',
        ]

    def get_usage_count(self, obj):
        """Programmes (not rows) that use this exercise — «در N برنامه بوده»."""
        from apps.programs.models import ProgramItem

        return (
            ProgramItem.objects.filter(exercise=obj, program_day__program__is_archived=False)
            .values('program_day__program_id')
            .distinct()
            .count()
        )

    def get_usage_count_items(self, obj):
        from apps.programs.models import ProgramItem

        return ProgramItem.objects.filter(exercise=obj).count()

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('نام حرکت الزامی است')
        if len(value) > 200:
            raise serializers.ValidationError('نام حرکت نباید بیشتر از ۲۰۰ کاراکتر باشد')
        return value
