from django.db import models
from django.conf import settings


class ProgramTemplate(models.Model):
    name = models.CharField(max_length=200)
    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='program_templates')
    days_per_week = models.PositiveIntegerField(default=3)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
    )

    class Meta:
        ordering = ['-created_at']


class ProgramTemplateDay(models.Model):
    template = models.ForeignKey(ProgramTemplate, on_delete=models.CASCADE, related_name='days')
    day_index = models.PositiveIntegerField()
    label = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['day_index']


class ProgramTemplateItem(models.Model):
    template_day = models.ForeignKey(ProgramTemplateDay, on_delete=models.CASCADE, related_name='items')
    exercise = models.ForeignKey('library.Exercise', on_delete=models.PROTECT)
    order = models.PositiveIntegerField(default=0)
    sets = models.CharField(max_length=20, default='3')
    reps = models.CharField(max_length=50, default='10')
    rest_seconds = models.PositiveIntegerField(null=True, blank=True)
    note = models.TextField(blank=True)
    superset_group = models.IntegerField(null=True, blank=True)
