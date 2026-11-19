import logging

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Program
from .pdf import render_pdf

logger = logging.getLogger(__name__)


def is_admin_user(user):
    return bool(user.is_staff or user.is_superuser or getattr(user, 'is_admin', lambda: False)())


def share_url_for(program) -> str:
    base = (getattr(settings, 'FRONTEND_BASE_URL', '') or '').rstrip('/')
    if not base or not program.share_token:
        return ''
    return f'{base}/public/program/{program.share_token}'


def pdf_filename(program) -> str:
    """ASCII-only filename (browsers would otherwise RFC2047-encode it)."""
    return f'physique-program-{program.sequence_number}.pdf'


class ProgramPDFView(APIView):
    """A4 PDF of a program (owner coach only; soft-deleted programs are 404)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        program = get_object_or_404(
            Program.objects.select_related('athlete', 'coach').prefetch_related(
                'days__items__exercise__category'
            ),
            pk=pk,
            deleted_at__isnull=True,
            is_archived=False,
        )
        if not is_admin_user(request.user) and program.coach_id != request.user.id:
            return Response({'detail': 'این برنامه متعلق به شما نیست.'}, status=403)

        try:
            content = render_pdf(program, share_url_for(program))
        except Exception:  # noqa: BLE001 - every renderer failure must stay a JSON 500
            logger.exception('program pdf failed: program=%s user=%s', program.pk, request.user.pk)
            return Response(
                {'detail': 'تولید فایل PDF انجام نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.'},
                status=500,
            )

        if not content:
            logger.error('program pdf empty: program=%s', program.pk)
            return Response({'detail': 'فایل PDF خالی تولید شد؛ دوباره تلاش کنید.'}, status=500)

        response = HttpResponse(content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{pdf_filename(program)}"'
        response['Content-Length'] = str(len(content))
        response['Cache-Control'] = 'private, no-store'
        return response


class PublicProgramPDFView(APIView):
    """Public PDF used by the share page; the token is the only credential."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        program = get_object_or_404(
            Program.objects.select_related('athlete', 'coach').prefetch_related(
                'days__items__exercise__category'
            ),
            share_token=token,
            deleted_at__isnull=True,
            is_archived=False,
        )
        try:
            content = render_pdf(program, share_url_for(program))
        except Exception:  # noqa: BLE001
            logger.exception('public program pdf failed: program=%s', program.pk)
            return Response(
                {'detail': 'تولید فایل PDF انجام نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.'},
                status=500,
            )
        response = HttpResponse(content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{pdf_filename(program)}"'
        response['Content-Length'] = str(len(content))
        return response

