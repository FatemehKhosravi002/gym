from rest_framework import serializers
from .models import Category, Exercise
from .utils import normalize_persian


class CategorySerializer(serializers.ModelSerializer):
    exercise_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'order', 'is_active', 'exercise_count']

    def get_exercise_count(self, obj):
        return obj.exercises.count()

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('نام دسته‌بندی الزامی است')
        if len(value) > 50:
            raise serializers.ValidationError('نام دسته‌بندی نباید بیشتر از ۵۰ کاراکتر باشد')
        norm = normalize_persian(value)
        qs = Category.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        for c in Category.objects.all():
            if self.instance and c.pk == self.instance.pk:
                continue
            if normalize_persian(c.name) == norm:
                raise serializers.ValidationError('این نام دسته‌بندی قبلاً ثبت شده است')
        return value


class ExerciseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    usage_count = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = ['id', 'name', 'category', 'category_name', 'video_file', 'video_url', 'gif_file', 'description', 'is_active', 'created_at', 'usage_count']

    def get_usage_count(self, obj):
        from apps.programs.models import ProgramItem
        return ProgramItem.objects.filter(exercise=obj).count()

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('نام حرکت الزامی است')
        return value


class CategorySerializer(CategorySerializer):
    class Meta(CategorySerializer.Meta):
        fields = ['id', 'name', 'order', 'is_active', 'exercise_count']
