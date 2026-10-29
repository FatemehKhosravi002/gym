from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Program, ProgramDay, ProgramItem
from .serializers import ProgramSerializer, ProgramDaySerializer, ProgramItemSerializer
from apps.athletes.permissions import IsCoachOrAdmin
from apps.library.models import Exercise


class ProgramViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_admin', lambda: False)() or user.is_staff:
            return Program.objects.select_related('athlete', 'coach').prefetch_related('days__items__exercise__category').filter(is_archived=False)
        return Program.objects.select_related('athlete', 'coach').prefetch_related('days__items__exercise__category').filter(coach=user, is_archived=False)

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='public/(?P<token>[^/.]+)')
    def public_share(self, request, token=None):
        program = get_object_or_404(Program.objects.prefetch_related('days__items__exercise__category'), share_token=token, is_archived=False)
        serializer = self.get_serializer(program)
        # Return minimal public data
        data = serializer.data
        # Remove sensitive info
        data.pop('coach', None)
        if data.get('athlete_detail'):
            data['athlete_detail'] = {'first_name': data['athlete_detail'].get('first_name'), 'last_name': data['athlete_detail'].get('last_name'), 'unique_code': data['athlete_detail'].get('unique_code')}
        return Response(data)

    @action(detail=True, methods=['post'])
    def regenerate_token(self, request, pk=None):
        program = self.get_object()
        import secrets
        program.share_token = secrets.token_urlsafe(48)
        program.save()
        return Response({'share_token': program.share_token})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        program = self.get_object()
        program.is_archived = True
        program.save()
        return Response({'status': 'archived'})

    @action(detail=False, methods=['get'])
    def duplicate_check(self, request):
        athlete_id = request.query_params.get('athlete_id')
        exercise_id = request.query_params.get('exercise_id')
        if not athlete_id or not exercise_id:
            return Response({'used': False})
        # Check last 2 programs
        programs = Program.objects.filter(athlete_id=athlete_id, is_archived=False).order_by('-created_at')[:2]
        used = False
        last_program = None
        for p in programs:
            if ProgramItem.objects.filter(program_day__program=p, exercise_id=exercise_id).exists():
                used = True
                if not last_program or p.created_at > last_program.created_at:
                    last_program = p
        if used and last_program:
            return Response({'used': True, 'program_id': last_program.id, 'program_number': last_program.sequence_number, 'program_title': last_program.title})
        return Response({'used': False})
