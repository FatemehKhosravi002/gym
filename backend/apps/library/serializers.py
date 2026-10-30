from rest_framework import serializers
from .models import Category, Exercise


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'order', 'is_active']


class ExerciseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Exercise
        fields = ['id', 'name', 'category', 'category_name', 'video_file', 'video_url', 'gif_file', 'description', 'is_active', 'created_at']


class ExerciseSerializer(ExerciseSerializer):
    usage_count = serializers.SerializerMethodField()

    class Meta(ExerciseSerializer.Meta):
        fields = ExerciseSerializer.Meta.fields + ['usage_count']

    def get_usage_count(self, obj):
        from apps.programs.models import ProgramItem
        return ProgramItem.objects.filter(exercise=obj).count()


class ExerciseSerializer(ExerciseSerializer):
    usage_count = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta(ExerciseSerializer.Meta):
        fields = ['id', 'name', 'category', 'category_name', 'video_file', 'video_url', 'gif_file', 'description', 'is_active', 'created_at', 'usage_count']

    def get_usage_count(self, obj):
        from apps.programs.models import ProgramItem
        return ProgramItem.objects.filter(exercise=obj).count()
