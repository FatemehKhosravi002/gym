from rest_framework import serializers
from .models import AthleteProfile, Measurement
from decimal import Decimal


class AthleteProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AthleteProfile
        fields = ['level', 'goal', 'height_cm', 'weight_kg', 'show_in_public_link']


class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        fields = ['id', 'athlete', 'date', 'weight_kg', 'height_cm', 'level', 'note']
        read_only_fields = ['id']

    def validate_weight_kg(self, value):
        if value < Decimal('20') or value > Decimal('300'):
            raise serializers.ValidationError('وزن باید بین ۲۰ تا ۳۰۰ کیلوگرم باشد')
        return value

    def validate_height_cm(self, value):
        if value is not None and (value < Decimal('100') or value > Decimal('250')):
            raise serializers.ValidationError('قد باید بین ۱۰۰ تا ۲۵۰ سانتی‌متر باشد')
        return value

    def validate(self, attrs):
        athlete = attrs.get('athlete') or getattr(self.instance, 'athlete')
        date = attrs.get('date') or getattr(self.instance, 'date')
        if athlete and date:
            qs = Measurement.objects.filter(athlete=athlete, date=date, deleted_at__isnull=True)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'date': 'برای این تاریخ قبلاً ثبت وزن انجام شده است'})
        return attrs
