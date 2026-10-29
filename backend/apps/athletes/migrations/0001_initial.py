from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Athlete',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('unique_code', models.CharField(editable=False, max_length=10, unique=True)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('coach', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='athletes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['first_name'], name='athletes_at_first_n_12345_idx'), models.Index(fields=['last_name'], name='athletes_at_last_na_12345_idx'), models.Index(fields=['unique_code'], name='athletes_at_unique__12345_idx')],
            },
        ),
    ]
