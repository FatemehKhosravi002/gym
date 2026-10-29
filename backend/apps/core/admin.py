from django.contrib import admin
from .models import AuditLog
from .models_settings import AppSettings


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'target_type', 'target_id', 'created_at']
    list_filter = ['action', 'target_type']
    readonly_fields = ['user', 'action', 'target_type', 'target_id', 'details', 'created_at']


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = ['registration_requires_approval']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
