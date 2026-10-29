from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    ACTION_CREATE = 'create'
    ACTION_UPDATE = 'update'
    ACTION_DELETE = 'delete'
    ACTION_RESTORE = 'restore'
    ACTION_APPROVE = 'approve'
    ACTION_REJECT = 'reject'
    ACTION_RESET_PASSWORD = 'reset_password'
    ACTION_PERMANENT_DELETE = 'permanent_delete'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=50)
    target_type = models.CharField(max_length=50)  # athlete, program, user
    target_id = models.CharField(max_length=100)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
