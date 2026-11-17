from django.contrib import admin
from .models import Athlete, AthleteCodeArchive, AthleteProfile, Measurement
from apps.programs.models import Program


class ProgramInline(admin.TabularInline):
    model = Program
    extra = 0
    readonly_fields = ['sequence_number', 'title', 'start_date', 'status', 'created_at']
    can_delete = False


@admin.register(Athlete)
class AthleteAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'unique_code', 'level', 'coach', 'deleted_at', 'created_at']
    search_fields = ['first_name', 'last_name', 'unique_code']
    list_filter = ['coach', 'level']
    inlines = [ProgramInline]
    readonly_fields = ['unique_code', 'search_index']


@admin.register(AthleteProfile)
class AthleteProfileAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'show_in_public_link']


@admin.register(AthleteCodeArchive)
class AthleteCodeArchiveAdmin(admin.ModelAdmin):
    list_display = ['code', 'athlete_name', 'archived_at']
    search_fields = ['code', 'athlete_name']


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'date', 'weight_kg', 'height_cm']
    list_filter = ['date']
