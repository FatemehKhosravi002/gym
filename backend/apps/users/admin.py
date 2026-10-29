from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'gym_name')}),
    )
    list_display = ['username', 'email', 'role', 'gym_name', 'is_staff']


# Add approval filters
from django.contrib import admin
from .models import User


class ApprovalFilter(admin.SimpleListFilter):
    title = 'در انتظار تأیید'
    parameter_name = 'pending'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'در انتظار تأیید'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(role='coach', is_approved=False)
        return queryset


# Re-register
admin.site.unregister(User)
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'gym_name', 'is_approved', 'must_change_password')}),
    )
    list_display = ['username', 'email', 'role', 'gym_name', 'is_approved', 'is_staff']
    list_filter = UserAdmin.list_filter + (ApprovalFilter,)
    actions = ['approve_coaches', 'reject_coaches']

    def approve_coaches(self, request, queryset):
        queryset.filter(role='coach').update(is_approved=True)
    approve_coaches.short_description = 'تأیید'

    def reject_coaches(self, request, queryset):
        queryset.filter(role='coach').update(is_active=False)
    reject_coaches.short_description = 'رد'
