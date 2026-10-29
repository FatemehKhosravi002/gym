from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_COACH = 'coach'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = (
        (ROLE_COACH, 'Coach'),
        (ROLE_ADMIN, 'Admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_COACH)
    phone = models.CharField(max_length=20, blank=True)
    gym_name = models.CharField(max_length=200, blank=True)
    is_approved = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)

    def is_admin(self):
        return self.role == self.ROLE_ADMIN or self.is_superuser


class UserManagerExtended(models.Manager):
    pass


# Add fields to User
from django.contrib.auth.models import AbstractUser
from django.db import models


# Monkey patch by redefining - easier to just extend
pass
