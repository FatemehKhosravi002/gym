"""Backwards-compatible import surface for profile/measurement serializers."""

from rest_framework import serializers

from .models import AthleteProfile
from .serializers import MeasurementSerializer  # noqa: F401  (re-export)


class AthleteProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AthleteProfile
        fields = ['show_in_public_link']
