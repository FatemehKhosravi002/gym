from decimal import Decimal

from rest_framework import serializers

from .models import Athlete, AthleteProfile, Measurement

MAX_NOTE_TAGS = 8
MAX_TAG_LENGTH = 40


class AthleteSerializer(serializers.ModelSerializer):
    """Compact payload used inside program payloads."""

    coach_name = serializers.CharField(source='coach.get_full_name', read_only=True)
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    has_note = serializers.BooleanField(read_only=True)
    last_program_date = serializers.SerializerMethodField()
    programs_count = serializers.SerializerMethodField()

    class Meta:
        model = Athlete
        fields = [
            'id', 'first_name', 'last_name', 'unique_code', 'phone', 'level', 'level_display',
            'goal', 'note_tags', 'has_note', 'coach', 'coach_name', 'created_at', 'deleted_at',
            'last_program_date', 'programs_count',
        ]
        read_only_fields = ['unique_code', 'coach', 'deleted_at']

    def get_last_program_date(self, obj):
        value = getattr(obj, 'last_program_date', None)
        return value.isoformat() if value else None

    def get_programs_count(self, obj):
        # annotated by the athlete endpoints; embedded payloads stay query-free
        return getattr(obj, 'programs_count_annotated', None)


class NoteTagsField(serializers.Field):
    """List of short free-form tags, normalized and de-duplicated."""

    def to_internal_value(self, data):
        if data in (None, ''):
            return []
        if isinstance(data, str):
            data = [data]
        if not isinstance(data, list):
            raise serializers.ValidationError('برچسب‌ها باید به صورت فهرست ارسال شوند.')
        tags, seen = [], set()
        for raw in data:
            tag = ' '.join(str(raw or '').split())
            if not tag:
                continue
            if len(tag) > MAX_TAG_LENGTH:
                raise serializers.ValidationError(f'هر برچسب حداکثر {MAX_TAG_LENGTH} نویسه است.')
            key = tag.replace('ي', 'ی').replace('ك', 'ک')
            if key in seen:
                continue
            seen.add(key)
            tags.append(tag)
        if len(tags) > MAX_NOTE_TAGS:
            raise serializers.ValidationError(f'حداکثر {MAX_NOTE_TAGS} برچسب مجاز است.')
        return tags

    def to_representation(self, value):
        return value or []


class AthleteWriteSerializer(serializers.ModelSerializer):
    note_tags = NoteTagsField(required=False)

    class Meta:
        model = Athlete
        fields = ['id', 'first_name', 'last_name', 'phone', 'level', 'goal', 'notes', 'note_tags']
        extra_kwargs = {
            'first_name': {'error_messages': {'blank': 'نام را وارد کنید.'}},
            'last_name': {'error_messages': {'blank': 'نام خانوادگی را وارد کنید.'}},
            'level': {'error_messages': {'invalid_choice': 'سطح انتخاب‌شده معتبر نیست.'}},
        }

    def validate_phone(self, value):
        digits = ''.join(ch for ch in (value or '') if ch.isdigit())
        if value and len(digits) < 8:
            raise serializers.ValidationError('شماره تلفن معتبر نیست.')
        return value.strip()


class MeasurementSerializer(serializers.ModelSerializer):
    weight_kg = serializers.FloatField(
        error_messages={'required': 'وزن را وارد کنید.', 'invalid': 'وزن را با عدد وارد کنید.'})
    height_cm = serializers.FloatField(required=False, allow_null=True)
    bmi = serializers.FloatField(read_only=True)

    class Meta:
        model = Measurement
        fields = ['id', 'athlete', 'date', 'weight_kg', 'height_cm', 'level', 'note', 'bmi', 'created_at']
        read_only_fields = ['id', 'created_at', 'athlete']
        extra_kwargs = {
            'date': {'error_messages': {'required': 'تاریخ را انتخاب کنید.', 'invalid': 'تاریخ معتبر نیست.'}},
        }

    def validate_weight_kg(self, value):
        if value < Decimal('20') or value > Decimal('300'):
            raise serializers.ValidationError('وزن باید بین ۲۰ تا ۳۰۰ کیلوگرم باشد.')
        return value

    def validate_height_cm(self, value):
        if value is not None and (value < Decimal('100') or value > Decimal('250')):
            raise serializers.ValidationError('قد باید بین ۱۰۰ تا ۲۵۰ سانتی‌متر باشد.')
        return value

    def validate_date(self, value):
        from django.utils import timezone

        if value > timezone.localdate():
            raise serializers.ValidationError('تاریخ نمی‌تواند در آینده باشد.')
        return value

    def validate(self, attrs):
        athlete = (attrs.get('athlete') or getattr(self.instance, 'athlete', None)
                    or self.context.get('athlete'))
        date = attrs.get('date') or getattr(self.instance, 'date', None)
        if athlete and date:
            qs = Measurement.objects.filter(athlete=athlete, date=date, deleted_at__isnull=True)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'date': 'برای این روز قبلاً اندازه‌گیری ثبت شده است. همان را ویرایش کنید.'}
                )
        return attrs


class AthleteDetailSerializer(AthleteSerializer):
    notes = serializers.CharField(allow_blank=True, required=False)
    weight_kg = serializers.SerializerMethodField()
    height_cm = serializers.SerializerMethodField()
    bmi = serializers.SerializerMethodField()
    last_measurement = serializers.SerializerMethodField()
    first_measurement = serializers.SerializerMethodField()
    measurements_count = serializers.SerializerMethodField()

    class Meta(AthleteSerializer.Meta):
        fields = AthleteSerializer.Meta.fields + [
            'notes', 'weight_kg', 'height_cm', 'bmi', 'last_measurement', 'first_measurement',
            'measurements_count', 'updated_at',
        ]

    def _measurement_set(self, obj):
        """All live measurements, reusing the prefetch cache (constant queries on detail)."""
        cache = getattr(obj, '_live_measurements', None)
        if cache is not None:
            return cache
        if 'measurements' in getattr(obj, '_prefetched_objects_cache', {}):
            rows = [m for m in obj.measurements.all() if m.deleted_at is None]
        else:
            rows = list(Measurement.objects.filter(athlete=obj, deleted_at__isnull=True))
        rows.sort(key=lambda m: (m.date, m.id))
        obj._live_measurements = rows
        return rows

    def _measurement(self, obj):
        rows = self._measurement_set(obj)
        return rows[-1] if rows else None

    def get_weight_kg(self, obj):
        m = self._measurement(obj)
        return float(m.weight_kg) if m else None

    def get_height_cm(self, obj):
        for measurement in reversed(self._measurement_set(obj)):
            if measurement.height_cm:
                return float(measurement.height_cm)
        return None

    def get_bmi(self, obj):
        m = self._measurement(obj)
        return m.bmi if m else None

    def get_last_measurement(self, obj):
        m = self._measurement(obj)
        if not m:
            return None
        return {'id': m.id, 'date': m.date, 'weight_kg': float(m.weight_kg),
                'height_cm': float(m.height_cm) if m.height_cm else None, 'note': m.note}

    def get_first_measurement(self, obj):
        rows = self._measurement_set(obj)
        cached = rows[0] if rows else None
        if not cached:
            return None
        return {'id': cached.id, 'date': cached.date, 'weight_kg': float(cached.weight_kg),
                'height_cm': float(cached.height_cm) if cached.height_cm else None}

    def get_measurements_count(self, obj):
        value = getattr(obj, 'measurements_count_annotated', None)
        return value if value is not None else len(self._measurement_set(obj))

