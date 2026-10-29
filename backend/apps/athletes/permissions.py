from rest_framework import permissions


class IsCoachOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (getattr(request.user, 'is_admin', lambda: False)() or request.user.role == 'coach' or request.user.is_staff)
