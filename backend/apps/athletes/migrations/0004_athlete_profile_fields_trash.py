import unicodedata

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

LEVEL_MAP = {
    'مبتدی': 'beginner',
    'نیمه‌حرفه‌ای': 'intermediate',
    'حرفه‌ای': 'advanced',
    'ورزشکار حرفه‌ای': 'pro',
}


def _norm(text):
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


def copy_profile_fields(apps, schema_editor):
    Athlete = apps.get_model('athletes', 'Athlete')
    AthleteProfile = apps.get_model('athletes', 'AthleteProfile')
    for profile in AthleteProfile.objects.select_related('athlete').iterator():
        athlete = profile.athlete
        athlete.level = LEVEL_MAP.get(profile.level, 'beginner')
        athlete.goal = profile.goal or ''
        if profile.deleted_at and not athlete.deleted_at:
            athlete.deleted_at = profile.deleted_at
        athlete.search_index = _norm(
            ' '.join([athlete.first_name or '', athlete.last_name or '', athlete.unique_code or '', athlete.phone or ''])
        )
        athlete.save(update_fields=['level', 'goal', 'deleted_at', 'search_index'])
    for athlete in Athlete.objects.iterator():
        athlete.search_index = _norm(
            ' '.join([athlete.first_name or '', athlete.last_name or '', athlete.unique_code or '', athlete.phone or ''])
        )
        athlete.save(update_fields=['search_index'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('athletes', '0003_rename_athletes_at_first_n_12345_idx_athletes_at_first_n_3a470b_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AthleteCodeArchive',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=10, unique=True)),
                ('athlete_name', models.CharField(blank=True, max_length=200)),
                ('archived_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-archived_at']},
        ),
        migrations.AlterModelOptions(name='athlete', options={'ordering': ['-created_at']}),
        migrations.AlterModelOptions(name='measurement', options={'ordering': ['-date', '-id']}),
        migrations.AlterUniqueTogether(name='measurement', unique_together=set()),
        migrations.AddField(
            model_name='athlete', name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='athlete', name='deleted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='athlete', name='goal',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='athlete', name='level',
            field=models.CharField(
                choices=[('beginner', 'مبتدی'), ('intermediate', 'متوسط'), ('advanced', 'پیشرفته'), ('pro', 'ورزشکار حرفه\u200cای')],
                default='beginner', max_length=20),
        ),
        migrations.AddField(
            model_name='athlete', name='note_tags',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='athlete', name='search_index',
            field=models.CharField(blank=True, editable=False, max_length=320),
        ),
        migrations.AddField(
            model_name='athlete', name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.RunPython(copy_profile_fields, noop),
        migrations.AlterField(
            model_name='athlete', name='notes',
            field=models.TextField(blank=True, help_text='یادداشت مربی: آسیب\u200cها و محدودیت\u200cها'),
        ),
        migrations.RemoveField(model_name='athleteprofile', name='deleted_at'),
        migrations.RemoveField(model_name='athleteprofile', name='deleted_by'),
        migrations.RemoveField(model_name='athleteprofile', name='goal'),
        migrations.RemoveField(model_name='athleteprofile', name='height_cm'),
        migrations.RemoveField(model_name='athleteprofile', name='level'),
        migrations.RemoveField(model_name='athleteprofile', name='weight_kg'),
        migrations.AddIndex(
            model_name='athlete',
            index=models.Index(fields=['coach', 'deleted_at'], name='athletes_at_coach_i_fef2b0_idx'),
        ),
        migrations.AddIndex(
            model_name='athlete',
            index=models.Index(fields=['search_index'], name='athletes_at_search__a66ae0_idx'),
        ),
        migrations.AddConstraint(
            model_name='measurement',
            constraint=models.UniqueConstraint(
                condition=models.Q(('deleted_at__isnull', True)),
                fields=('athlete', 'date'), name='uniq_measurement_per_athlete_day'),
        ),
    ]
