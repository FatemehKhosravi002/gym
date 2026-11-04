from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('library', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProgramTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('days_per_week', models.PositiveIntegerField(default=3)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('coach', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='program_templates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProgramTemplateDay',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day_index', models.PositiveIntegerField()),
                ('label', models.CharField(blank=True, max_length=200)),
                ('template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='days', to='program_templates.programtemplate')),
            ],
            options={
                'ordering': ['day_index'],
            },
        ),
        migrations.CreateModel(
            name='ProgramTemplateItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(default=0)),
                ('sets', models.CharField(default='3', max_length=20)),
                ('reps', models.CharField(default='10', max_length=50)),
                ('rest_seconds', models.PositiveIntegerField(blank=True, null=True)),
                ('note', models.TextField(blank=True)),
                ('superset_group', models.IntegerField(blank=True, null=True)),
                ('exercise', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='library.exercise')),
                ('template_day', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='program_templates.programtemplateday')),
            ],
        ),
    ]
