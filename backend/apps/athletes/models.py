import random
import string
from django.db import models
from django.conf import settings


def generate_unique_code():
    while True:
        code = ''.join(random.choices(string.digits, k=6))
        if not Athlete.objects.filter(unique_code=code).exists():
            return code


class Athlete(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    unique_code = models.CharField(max_length=10, unique=True, editable=False)
    phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='athletes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['first_name']),
            models.Index(fields=['last_name']),
            models.Index(fields=['unique_code']),
        ]

    def save(self, *args, **kwargs):
        if not self.unique_code:
            self.unique_code = generate_unique_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.unique_code})'


class AthleteProfile(models.Model):
    LEVEL_BEGINNER = 'مبتدی'
    LEVEL_INTERMEDIATE = 'نیمه‌حرفه‌ای'
    LEVEL_ADVANCED = 'حرفه‌ای'
    LEVEL_CHOICES = (
        (LEVEL_BEGINNER, 'مبتدی'),
        (LEVEL_INTERMEDIATE, 'نیمه‌حرفه‌ای'),
        (LEVEL_ADVANCED, 'حرفه‌ای'),
    )
    athlete = models.OneToOneField(Athlete, on_delete=models.CASCADE, related_name='profile')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=LEVEL_BEGINNER)
    goal = models.CharField(max_length=200, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    show_in_public_link = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    def __str__(self):
        return str(self.athlete)


class Measurement(models.Model):
    athlete = models.ForeignKey(Athlete, on_delete=models.CASCADE, related_name='measurements')
    date = models.DateField()
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    level = models.CharField(max_length=20, blank=True)
    note = models.TextField(blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        unique_together = [['athlete', 'date']]

    def __str__(self):
        return f'{self.athlete} - {self.date} - {self.weight_kg}'
