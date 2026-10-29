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
