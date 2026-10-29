from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AppSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('registration_requires_approval', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'تنظیمات برنامه',
                'verbose_name_plural': 'تنظیمات برنامه',
            },
        ),
    ]
