from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from apps.core.models_settings import AppSettings
from apps.core.models import AuditLog
from apps.athletes.models import Athlete
from apps.programs.models import Program
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class IsSuperuser(IsAuthenticated):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class OverviewView(APIView):
    permission_classes = [IsSuperuser]

    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        data = {
            'coaches_count': User.objects.filter(role='coach').count(),
            'athletes_count': Athlete.objects.count(),
            'programs_count': Program.objects.count(),
            'programs_this_month': Program.objects.filter(created_at__gte=month_start).count(),
            'new_coaches_7_days': User.objects.filter(role='coach', date_joined__gte=week_ago).count(),
        }
        return Response(data)


class SettingsView(APIView):
    permission_classes = [IsSuperuser]

    def get(self, request):
        s = AppSettings.load()
        return Response({'registration_requires_approval': s.registration_requires_approval})

    def post(self, request):
        s = AppSettings.load()
        s.registration_requires_approval = bool(request.data.get('registration_requires_approval'))
        s.save()
        AuditLog.objects.create(user=request.user, action='update', target_type='settings', target_id='app', details=f'registration_requires_approval={s.registration_requires_approval}')
        return Response({'registration_requires_approval': s.registration_requires_approval})


class CoachesListView(APIView):
    permission_classes = [IsSuperuser]

    def get(self, request):
        search = request.query_params.get('search', '')
        filt = request.query_params.get('filter', 'all')
        qs = User.objects.filter(role='coach').annotate(
            athletes_count=Count('athletes', distinct=True),
            programs_count=Count('programs', distinct=True)
        )
        if search:
            qs = qs.filter(Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(username__icontains=search))
        if filt == 'active':
            qs = qs.filter(is_approved=True, is_active=True)
        elif filt == 'inactive':
            qs = qs.filter(is_active=False)
        elif filt == 'pending':
            qs = qs.filter(is_approved=False)
        data = []
        for u in qs.order_by('-date_joined')[:200]:
            data.append({
                'id': u.id,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'username': u.username,
                'phone': u.phone,
                'date_joined': u.date_joined,
                'last_login': u.last_login,
                'is_approved': u.is_approved,
                'is_active': u.is_active,
                'athletes_count': getattr(u, 'athletes_count', 0),
                'programs_count': getattr(u, 'programs_count', 0),
            })
        return Response(data)


class CoachActionView(APIView):
    permission_classes = [IsSuperuser]

    def post(self, request, pk):
        action = request.data.get('action')
        try:
            u = User.objects.get(pk=pk, role='coach')
        except User.DoesNotExist:
            return Response({'detail': 'کاربر یافت نشد'}, status=404)
        if action == 'approve':
            u.is_approved = True
            u.is_active = True
            u.save()
            AuditLog.objects.create(user=request.user, action='approve', target_type='user', target_id=str(u.id))
            return Response({'detail': 'تأیید شد'})
        elif action == 'deactivate':
            u.is_active = False
            u.save()
            # blacklist tokens
            try:
                for token in OutstandingToken.objects.filter(user=u):
                    BlacklistedToken.objects.get_or_create(token=token)
            except:
                pass
            AuditLog.objects.create(user=request.user, action='deactivate', target_type='user', target_id=str(u.id))
            return Response({'detail': 'غیرفعال شد'})
        elif action == 'activate':
            u.is_active = True
            u.save()
            AuditLog.objects.create(user=request.user, action='activate', target_type='user', target_id=str(u.id))
            return Response({'detail': 'فعال شد'})
        elif action == 'reset_password':
            import secrets, string
            temp = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
            u.set_password(temp)
            u.must_change_password = True
            u.save()
            AuditLog.objects.create(user=request.user, action='reset_password', target_type='user', target_id=str(u.id))
            return Response({'temp_password': temp})
        return Response({'detail': 'عمل نامعتبر'}, status=400)


class CoachDetailView(APIView):
    permission_classes = [IsSuperuser]

    def get(self, request, pk):
        try:
            u = User.objects.get(pk=pk, role='coach')
        except User.DoesNotExist:
            return Response({'detail': 'کاربر یافت نشد'}, status=404)
        athletes = Athlete.objects.filter(coach=u).values('id', 'first_name', 'last_name', 'unique_code')
        programs = Program.objects.filter(coach=u).values('id', 'athlete_id', 'sequence_number', 'title', 'start_date', 'created_at')[:50]
        return Response({'athletes': list(athletes), 'programs': list(programs)})
