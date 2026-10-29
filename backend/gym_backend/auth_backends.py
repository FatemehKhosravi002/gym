from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class ActiveUserBackend(ModelBackend):
    def user_can_authenticate(self, user):
        is_active = super().user_can_authenticate(user)
        if not is_active:
            return False
        if getattr(user, 'role', None) == 'coach' and not getattr(user, 'is_active', True):
            return False
        return True
