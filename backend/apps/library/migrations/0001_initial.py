from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('order', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Exercise',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('video_file', models.FileField(blank=True, null=True, upload_to='exercises/videos/')),
                ('video_url', models.URLField(blank=True)),
                ('gif_file', models.ImageField(blank=True, null=True, upload_to='exercises/gifs/')),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='exercises', to='library.category')),
            ],
            options={
                'ordering': ['name'],
                'indexes': [models.Index(fields=['name'], name='library_exe_name_12345_idx'), models.Index(fields=['category'], name='library_exe_categ_12345_idx')],
            },
        ),
    ]
