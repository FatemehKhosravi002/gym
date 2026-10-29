from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from .serializers_auth import RegisterSerializer
from apps.core.models import AuditLog
from apps.core.models_settings import AppSettings

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key='ip', rate='5/h', method='POST', block=True))
    def post(self, request):
        if request.data.get('website'):
            return Response({'detail': 'درخواست نامعتبر'}, status=400)
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            settings_obj = AppSettings.load()
            user = serializer.save()
            if settings_obj.registration_requires_approval:
                user.is_approved = False
                user.save()
                return Response({'detail': 'حساب شما ثبت شد و پس از تأیید ادمین سیستم فعال می‌شود.', 'requires_approval': True}, status=201)
            else:
                user.is_approved = True
                user.is_active = True
                user.save()
                refresh = RefreshToken.for_user(user)
                return Response({
                    'detail': 'ثبت‌نام با موفقیت انجام شد',
                    'requires_approval': False,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': user.role,
                        'is_approved': user.is_approved,
                        'must_change_password': getattr(user, 'must_change_password', False),
                        'is_superuser': user.is_superuser,
                    }
                }, status=201)
        errors = {}
        for k, v in serializer.errors.items():
            if isinstance(v, list):
                errors[k] = v[0]
            else:
                errors[k] = str(v)
        return Response(errors, status=400)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current = request.data.get('current_password')
        new_pass = request.data.get('new_password')
        confirm = request.data.get('confirm_password')
        if not user.check_password(current):
            return Response({'current_password': 'رمز عبور فعلی اشتباه است'}, status=400)
        if new_pass != confirm:
            return Response({'confirm_password': 'تکرار رمز عبور مطابقت ندارد'}, status=400)
        try:
            validate_password(new_pass, user)
        except Exception as e:
            if hasattr(e, 'messages'):
                return Response({'new_password': e.messages[0]}, status=400)
            return Response({'new_password': str(e)}, status=400)
        user.set_password(new_pass)
        user.must_change_password = False
        user.save()
        return Response({'detail': 'رمز عبور با موفقیت تغییر یافت'})


class PendingCoachesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or request.user.role == 'admin'):
            return Response({'detail': 'دسترسی غیرمجاز'}, status=403)
        users = User.objects.filter(role='coach', is_approved=False)
        data = [{'id': u.id, 'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name, 'phone': u.phone, 'date_joined': u.date_joined} for u in users]
        return Response(data)

    def post(self, request):
        if not (request.user.is_superuser or request.user.role == 'admin'):
            return Response({'detail': 'دسترسی غیرمجاز'}, status=403)
        user_id = request.data.get('user_id')
        action = request.data.get('action')
        try:
            u = User.objects.get(id=user_id, role='coach')
        except User.DoesNotExist:
            return Response({'detail': 'کاربر یافت نشد'}, status=404)
        if action == 'approve':
            u.is_approved = True
            u.is_active = True
            u.save()
            AuditLog.objects.create(user=request.user, action='approve', target_type='user', target_id=str(u.id), details=u.username)
            return Response({'detail': 'تأیید شد'})
        elif action == 'reject':
            u.is_active = False
            u.save()
            AuditLog.objects.create(user=request.user, action='reject', target_type='user', target_id=str(u.id), details=u.username)
            return Response({'detail': 'رد شد'})
        elif action == 'deactivate':
            u.is_active = False
            u.save()
            return Response({'detail': 'غیرفعال شد'})
        return Response({'detail': 'عمل نامعتبر'}, status=400)


class ResetCoachPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or request.user.role == 'admin'):
            return Response({'detail': 'دسترسی غیرمجاز'}, status=403)
        user_id = request.data.get('user_id')
        try:
            u = User.objects.get(id=user_id, role='coach')
        except User.DoesNotExist:
            return Response({'detail': 'کاربر یافت نشد'}, status=404)
        import secrets, string
        temp = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        u.set_password(temp)
        u.must_change_password = True
        u.save()
        AuditLog.objects.create(user=request.user, action='reset_password', target_type='user', target_id=str(u.id), details=u.username)
        return Response({'temp_password': temp})


from rest_framework_simplejwt.views import TokenObtainPairView
from .custom_auth import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
