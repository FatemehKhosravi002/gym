from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('athletes', '0001_initial'),
        ('library', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Program',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sequence_number', models.PositiveIntegerField()),
                ('title', models.CharField(max_length=200)),
                ('start_date', models.DateField()),
                ('days_per_week', models.PositiveIntegerField(default=3)),
                ('notes', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('final', 'Final')], default='draft', max_length=10)),
                ('share_token', models.CharField(blank=True, max_length=64, unique=True)),
                ('is_archived', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('athlete', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='programs', to='athletes.athlete')),
                ('coach', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='programs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('athlete', 'sequence_number')},
                'indexes': [models.Index(fields=['athlete', 'created_at'], name='programs_pr_athlete_12345_idx'), models.Index(fields=['share_token'], name='programs_pr_share_t_12345_idx')],
            },
        ),
        migrations.CreateModel(
            name='ProgramDay',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day_index', models.PositiveIntegerField()),
                ('label', models.CharField(blank=True, max_length=200)),
                ('program', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='days', to='programs.program')),
            ],
            options={
                'ordering': ['day_index'],
                'unique_together': {('program', 'day_index')},
            },
        ),
        migrations.CreateModel(
            name='ProgramItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(default=0)),
                ('sets', models.CharField(default='3', max_length=20)),
                ('reps', models.CharField(default='10', max_length=50)),
                ('rest_seconds', models.PositiveIntegerField(blank=True, null=True)),
                ('note', models.TextField(blank=True)),
                ('superset_group', models.IntegerField(blank=True, null=True)),
                ('exercise_name_snapshot', models.CharField(blank=True, max_length=200)),
                ('exercise', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='library.exercise')),
                ('program_day', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='programs.programday')),
            ],
            options={
                'ordering': ['superset_group', 'order'],
            },
        ),
    ]
