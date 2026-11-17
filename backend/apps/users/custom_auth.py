from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed


User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if getattr(user, 'role', None) == 'coach' and not getattr(user, 'is_approved', False):
            raise AuthenticationFailed('حساب شما ثبت شد و پس از تأیید ادمین سیستم فعال می‌شود.', code='not_approved')
        if not getattr(user, 'is_active', True):
            raise AuthenticationFailed('حساب شما غیرفعال شده است.', code='inactive')
        if getattr(user, 'must_change_password', False):
            data['must_change_password'] = True
        return data


class ActiveUserTokenRefreshSerializer(TokenRefreshSerializer):
    """Refreshing must not resurrect a deactivated or unapproved account."""

    def validate(self, attrs):
        token = RefreshToken(attrs['refresh'])
        user_id = token.payload.get(api_settings.USER_ID_CLAIM)
        user = User.objects.filter(**{api_settings.USER_ID_FIELD: user_id}).first()
        if user is None or not user.is_active:
            raise AuthenticationFailed('حساب کاربری غیرفعال است. لطفاً دوباره وارد شوید.', code='inactive')
        if getattr(user, 'role', None) == 'coach' and not getattr(user, 'is_approved', False):
            raise AuthenticationFailed('حساب شما تأیید نشده است.', code='not_approved')
        return super().validate(attrs)

