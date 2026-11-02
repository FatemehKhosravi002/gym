from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import ProgramDay, ProgramItem
from rest_framework import serializers


class ProgramDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramDay
        fields = ['id', 'program', 'day_index', 'label']


class ProgramItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramItem
        fields = ['id', 'program_day', 'exercise', 'order', 'sets', 'reps', 'rest_seconds', 'note', 'superset_group']


class ProgramDayViewSet(viewsets.ModelViewSet):
    queryset = ProgramDay.objects.all()
    serializer_class = ProgramDaySerializer
    permission_classes = [IsAuthenticated]


class ProgramItemViewSet(viewsets.ModelViewSet):
    queryset = ProgramItem.objects.all()
    serializer_class = ProgramItemSerializer
    permission_classes = [IsAuthenticated]
