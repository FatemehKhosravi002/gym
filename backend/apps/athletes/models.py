import random
import string
import unicodedata

from django.conf import settings
from django.db import models


def normalize_persian(text: str) -> str:
    """Normalize Persian/Arabic text for tolerant search.

    * Arabic yeh/kaf -> Persian yeh/kaf (ي -> ی, ك -> ک)
    * removes ZWNJ (نیم‌فاصله), tatweel, diacritics and punctuation
    * collapses whitespace, lowercases latin
    """
    if not text:
        return ''
    text = unicodedata.normalize('NFKC', str(text)).lower()
    text = text.replace('ي', 'ی').replace('ك', 'ک').replace('ى', 'ی')
    text = text.replace('\u200c', ' ').replace('\u200d', ' ').replace('\u0640', '')
    kept = []
    for ch in text:
        if ch.isspace():
            kept.append(' ')
        elif unicodedata.category(ch).startswith(('L', 'N')):
            kept.append(ch)
    return ' '.join(''.join(kept).split())


def _random_code():
    return ''.join(random.choices(string.digits, k=6))


def generate_unique_code():
    """Return a 6-digit code that was never used before (also after permanent delete)."""
    for _ in range(100):
        code = _random_code()
        if Athlete.objects.filter(unique_code=code).exists():
            continue
        if AthleteCodeArchive.objects.filter(code=code).exists():
            continue
        return code
    raise RuntimeError('could not allocate a unique athlete code')


class Athlete(models.Model):
    LEVEL_BEGINNER = 'beginner'
    LEVEL_INTERMEDIATE = 'intermediate'
    LEVEL_ADVANCED = 'advanced'
    LEVEL_PRO = 'pro'
    LEVEL_CHOICES = (
        (LEVEL_BEGINNER, 'مبتدی'),
        (LEVEL_INTERMEDIATE, 'متوسط'),
        (LEVEL_ADVANCED, 'پیشرفته'),
        (LEVEL_PRO, 'ورزشکار حرفه‌ای'),
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    unique_code = models.CharField(max_length=10, unique=True, editable=False)
    phone = models.CharField(max_length=20, blank=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=LEVEL_BEGINNER)
    goal = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True, help_text='یادداشت مربی: آسیب‌ها و محدودیت‌ها')
    note_tags = models.JSONField(default=list, blank=True)
    search_index = models.CharField(max_length=320, blank=True, editable=False)
    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='athletes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['first_name']),
            models.Index(fields=['last_name']),
            models.Index(fields=['unique_code']),
            models.Index(fields=['coach', 'deleted_at']),
            models.Index(fields=['search_index']),
        ]

    def build_search_index(self):
        parts = [self.first_name, self.last_name, self.unique_code, self.phone]
        parts.extend(self.note_tags or [])
        normalized = normalize_persian(' '.join(str(p or '') for p in parts))
        squashed = normalized.replace(' ', '')
        return f'{normalized} {squashed}'.strip()

    def save(self, *args, **kwargs):
        if not self.unique_code:
            self.unique_code = generate_unique_code()
        self.search_index = self.build_search_index()
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def has_note(self):
        return bool((self.notes or '').strip() or (self.note_tags or []))

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.unique_code})'


class AthleteCodeArchive(models.Model):
    """Codes of permanently deleted athletes; guarantees a code is never reused."""

    code = models.CharField(max_length=10, unique=True)
    athlete_name = models.CharField(max_length=200, blank=True)
    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-archived_at']

    def __str__(self):
        return self.code


class AthleteProfile(models.Model):
    """Extra public-profile data. Level/goal/notes live on Athlete."""

    athlete = models.OneToOneField(Athlete, on_delete=models.CASCADE, related_name='profile')
    show_in_public_link = models.BooleanField(default=False)

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
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['athlete', 'date'],
                condition=models.Q(deleted_at__isnull=True),
                name='uniq_measurement_per_athlete_day',
            )
        ]

    @property
    def bmi(self):
        if not self.weight_kg or not self.height_cm:
            return None
        height_m = float(self.height_cm) / 100
        return round(float(self.weight_kg) / (height_m * height_m), 1)

    def __str__(self):
        return f'{self.athlete} - {self.date} - {self.weight_kg}'
