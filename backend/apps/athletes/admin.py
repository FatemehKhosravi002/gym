from django.contrib import admin
from .models import Athlete, AthleteProfile, Measurement
from apps.programs.models import Program


class ProgramInline(admin.TabularInline):
    model = Program
    extra = 0
    readonly_fields = ['sequence_number', 'title', 'start_date', 'status', 'created_at']
    can_delete = False


@admin.register(Athlete)
class AthleteAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'unique_code', 'coach', 'created_at']
    search_fields = ['first_name', 'last_name', 'unique_code']
    list_filter = ['coach']
    inlines = [ProgramInline]
    readonly_fields = ['unique_code']


@admin.register(AthleteProfile)
class AthleteProfileAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'level', 'height_cm', 'weight_kg']


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'date', 'weight_kg', 'height_cm']
    list_filter = ['date']
