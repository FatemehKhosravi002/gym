from django.db import transaction
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


class ProgramItemWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProgramItem
        fields = ['id', 'exercise', 'order', 'sets', 'reps', 'rest_seconds', 'note', 'superset_group']


class ProgramDayWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    items = ProgramItemWriteSerializer(many=True, required=False)

    class Meta:
        model = ProgramDay
        fields = ['id', 'day_index', 'label', 'items']

    def validate_day_index(self, value):
        if not 1 <= value <= 7:
            raise serializers.ValidationError('شماره روز باید بین ۱ تا ۷ باشد.')
        return value


def sync_program_days(program, days_data):
    """Replace a program's days/items with ``days_data`` (caller is atomic).

    Days and items are matched by ``id``; anything missing from the payload is
    deleted. Sequence number and share token are never touched here.
    """
    existing_days = {day.id: day for day in program.days.all()}
    seen_indexes = set()
    kept_day_ids = set()

    for payload in days_data:
        day_index = payload['day_index']
        if day_index in seen_indexes:
            raise serializers.ValidationError({'days': 'شماره روزها تکراری است.'})
        seen_indexes.add(day_index)

        day = existing_days.get(payload.get('id'))
        if day is None:
            day = ProgramDay.objects.create(
                program=program, day_index=day_index, label=payload.get('label', '')
            )
        else:
            day.day_index = day_index
            day.label = payload.get('label', '')
            day.save(update_fields=['day_index', 'label'])
        kept_day_ids.add(day.id)

        items_payload = payload.get('items')
        if items_payload is None:
            continue
        existing_items = {item.id: item for item in day.items.all()}
        kept_item_ids = set()
        for position, item_payload in enumerate(items_payload):
            item = existing_items.get(item_payload.get('id'))
            values = {
                'exercise': item_payload['exercise'],
                'order': item_payload.get('order', position),
                'sets': item_payload.get('sets', '3'),
                'reps': item_payload.get('reps', '10'),
                'rest_seconds': item_payload.get('rest_seconds'),
                'note': item_payload.get('note', ''),
                'superset_group': item_payload.get('superset_group'),
            }
            if item is None:
                item = ProgramItem.objects.create(program_day=day, **values)
            else:
                for field, value in values.items():
                    setattr(item, field, value)
                item.save()
            kept_item_ids.add(item.id)
        day.items.exclude(id__in=kept_item_ids).delete()

    program.days.exclude(id__in=kept_day_ids).delete()


class ProgramSerializer(serializers.ModelSerializer):
    days = ProgramDaySerializer(many=True, read_only=True)
    athlete_detail = AthleteSerializer(source='athlete', read_only=True)

    class Meta:
        model = Program
        fields = ['id', 'athlete', 'athlete_detail', 'coach', 'sequence_number', 'title', 'start_date', 'days_per_week', 'notes', 'status', 'share_token', 'shared_at', 'is_archived', 'deleted_at', 'created_at', 'updated_at', 'days']
        read_only_fields = ['coach', 'sequence_number', 'share_token', 'shared_at', 'deleted_at']

    def to_internal_value(self, data):
        """Accept a nested ``days`` list on write while keeping it read-only on read."""
        raw_days = None
        if hasattr(data, 'get') and data.get('days') is not None:
            try:
                data = data.copy()
            except AttributeError:
                data = dict(data)
            raw_days = data.pop('days')
        validated = super().to_internal_value(data)
        if raw_days is not None:
            nested = ProgramDayWriteSerializer(data=raw_days, many=True, context=self.context)
            nested.is_valid(raise_exception=True)
            validated['days'] = nested.validated_data
        return validated

    def create(self, validated_data):
        days_data = validated_data.pop('days', None)
        with transaction.atomic():
            program = Program.objects.create(**validated_data)
            if days_data is not None:
                sync_program_days(program, days_data)
        return program

    def update(self, instance, validated_data):
        days_data = validated_data.pop('days', None)
        with transaction.atomic():
            for field, value in validated_data.items():
                setattr(instance, field, value)
            instance.save()
            if days_data is not None:
                sync_program_days(instance, days_data)
        return instance

