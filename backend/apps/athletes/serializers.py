from rest_framework import serializers
from .models import Athlete


class AthleteSerializer(serializers.ModelSerializer):
    coach_name = serializers.CharField(source='coach.get_full_name', read_only=True)

    class Meta:
        model = Athlete
        fields = ['id', 'first_name', 'last_name', 'unique_code', 'phone', 'notes', 'coach', 'coach_name', 'created_at']
        read_only_fields = ['unique_code', 'coach']


class AthleteDetailSerializer(serializers.ModelSerializer):
    coach_name = serializers.CharField(source='coach.get_full_name', read_only=True)
    height_cm = serializers.SerializerMethodField()
    weight_kg = serializers.SerializerMethodField()
    last_measurement = serializers.SerializerMethodField()

    class Meta:
        model = Athlete
        fields = ['id', 'first_name', 'last_name', 'unique_code', 'phone', 'notes', 'coach', 'coach_name', 'created_at', 'height_cm', 'weight_kg', 'last_measurement']
        read_only_fields = ['unique_code', 'coach']

    def get_last_measurement(self, obj):
        m = obj.measurements.filter(deleted_at__isnull=True).first()
        if not m:
            return None
        return {
            'id': m.id,
            'date': m.date,
            'weight_kg': m.weight_kg,
            'height_cm': m.height_cm,
            'note': m.note,
        }

    def get_height_cm(self, obj):
        lm = self.get_last_measurement(obj)
        if lm and lm.get('height_cm'):
            return lm.get('height_cm')
        if hasattr(obj, 'profile') and obj.profile:
            return obj.profile.height_cm
        return None

    def get_weight_kg(self, obj):
        lm = self.get_last_measurement(obj)
        if lm and lm.get('weight_kg'):
            return lm.get('weight_kg')
        if hasattr(obj, 'profile') and obj.profile:
            return obj.profile.weight_kg
        return None


class AthleteUpdateSerializer(serializers.ModelSerializer):
    height_cm = serializers.DecimalField(max_digits=5, decimal_places=1, required=False, allow_null=True)
    weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = Athlete
        fields = ['id', 'first_name', 'last_name', 'phone', 'notes', 'height_cm', 'weight_kg']

    def update(self, instance, validated_data):
        height_cm = validated_data.pop('height_cm', None)
        weight_kg = validated_data.pop('weight_kg', None)
        athlete = super().update(instance, validated_data)
        if height_cm is not None or weight_kg is not None:
            from .models import AthleteProfile, Measurement
            profile, _ = AthleteProfile.objects.get_or_create(athlete=athlete)
            if height_cm is not None:
                profile.height_cm = height_cm
            if weight_kg is not None:
                profile.weight_kg = weight_kg
            profile.save()
        return athlete
