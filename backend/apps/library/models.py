from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Exercise(models.Model):
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='exercises')
    video_file = models.FileField(upload_to='exercises/videos/', blank=True, null=True)
    video_url = models.URLField(blank=True)
    gif_file = models.ImageField(upload_to='exercises/gifs/', blank=True, null=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['category']),
        ]
        ordering = ['name']

    def __str__(self):
        return self.name
