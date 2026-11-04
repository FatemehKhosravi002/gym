from django.contrib import admin
from .models import Program, ProgramDay, ProgramItem


class ProgramItemInline(admin.TabularInline):
    model = ProgramItem
    extra = 0


class ProgramDayInline(admin.TabularInline):
    model = ProgramDay
    extra = 0


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'sequence_number', 'coach', 'title', 'start_date', 'status', 'created_at']
    search_fields = ['athlete__first_name', 'athlete__last_name', 'athlete__unique_code']
    list_filter = ['coach', 'status', 'start_date']
    inlines = [ProgramDayInline]
    readonly_fields = ['sequence_number', 'share_token']
