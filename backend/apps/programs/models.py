import secrets
from django.db import models
from django.conf import settings
from apps.athletes.models import Athlete
from apps.library.models import Exercise


class Program(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_FINAL = 'final'
    STATUS_CHOICES = (
        (STATUS_DRAFT, 'Draft'),
        (STATUS_FINAL, 'Final'),
    )

    athlete = models.ForeignKey(Athlete, on_delete=models.PROTECT, related_name='programs')
    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='programs')
    sequence_number = models.PositiveIntegerField()
    title = models.CharField(max_length=200)
    start_date = models.DateField()
    days_per_week = models.PositiveIntegerField(default=3)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    share_token = models.CharField(max_length=64, unique=True, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [['athlete', 'sequence_number']]
        indexes = [
            models.Index(fields=['athlete', 'created_at']),
            models.Index(fields=['share_token']),
        ]

    def save(self, *args, **kwargs):
        if not self.share_token:
            self.share_token = secrets.token_urlsafe(48)
        if not self.sequence_number:
            last = Program.objects.filter(athlete=self.athlete).order_by('-sequence_number').first()
            self.sequence_number = (last.sequence_number + 1) if last else 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.athlete} - Program {self.sequence_number}'


class ProgramDay(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='days')
    day_index = models.PositiveIntegerField()
    label = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['day_index']
        unique_together = [['program', 'day_index']]

    def __str__(self):
        return f'{self.program} - Day {self.day_index}'


class ProgramItem(models.Model):
    program_day = models.ForeignKey(ProgramDay, on_delete=models.CASCADE, related_name='items')
    exercise = models.ForeignKey(Exercise, on_delete=models.PROTECT)
    order = models.PositiveIntegerField(default=0)
    sets = models.CharField(max_length=20, default='3')
    reps = models.CharField(max_length=50, default='10')
    rest_seconds = models.PositiveIntegerField(null=True, blank=True)
    note = models.TextField(blank=True)
    superset_group = models.IntegerField(null=True, blank=True)
    exercise_name_snapshot = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['superset_group', 'order']

    def save(self, *args, **kwargs):
        if not self.exercise_name_snapshot:
            self.exercise_name_snapshot = self.exercise.name
        super().save(*args, **kwargs)
