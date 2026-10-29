from rest_framework import serializers
from .models import Athlete


class AthleteSerializer(serializers.ModelSerializer):
    coach_name = serializers.CharField(source='coach.get_full_name', read_only=True)

    class Meta:
        model = Athlete
        fields = ['id', 'first_name', 'last_name', 'unique_code', 'phone', 'notes', 'coach', 'coach_name', 'created_at']
        read_only_fields = ['unique_code', 'coach']
