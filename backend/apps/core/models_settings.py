from django.db import models


class AppSettings(models.Model):
    registration_requires_approval = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'تنظیمات برنامه'
        verbose_name_plural = 'تنظیمات برنامه'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
