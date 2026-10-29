from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed


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
