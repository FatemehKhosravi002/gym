from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from .models import Program
from apps.core.utils_jalali import gregorian_to_jalali_str, gregorian_to_jalali_month_label
import os

try:
    from weasyhtml import HTML
    from weasyprint import HTML as HTML2
except Exception:
    try:
        from weasyprint import HTML
    except Exception:
        HTML = None


class ProgramPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            program = get_object_or_404(Program, pk=pk)
            if request.user.role == 'coach' and program.coach_id != request.user.id and not (request.user.is_superuser or getattr(request.user,'role',None)=='admin'):
                return Response({'detail': 'دسترسی غیرمجاز'}, status=403)
            html_content = f'''
            <!DOCTYPE html>
            <html lang="fa" dir="rtl">
            <head>
                <meta charset="utf-8">
                <style>
                    @font-face {{
                        font-family: 'Sahel FD';
                        src: url('file:///app/fonts/Sahel-FD.ttf') format('truetype');
                    }}
                    * {{ font-family: 'Sahel FD', Tahoma, sans-serif; direction: rtl; }}
                    body {{ padding: 20px; }}
                    h1, h2 {{ font-weight: bold; }}
                    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
                    th, td {{ border: 1px solid #333; padding: 6px; text-align: right; }}
                    .footer {{ position: fixed; bottom: 10px; width: 100%; text-align: center; font-size: 10px; }}
                </style>
            </head>
            <body>
                <h1>Physique</h1>
                <p>ورزشکار: {program.athlete.first_name} {program.athlete.last_name} | کد: {program.athlete.unique_code}</p>
                <p>مربی: {program.coach.get_full_name() or program.coach.username}</p>
                <p>برنامه شماره: {program.sequence_number} | {gregorian_to_jalali_month_label(program.start_date)} | تاریخ: {gregorian_to_jalali_str(program.start_date)}</p>
                <p>تعداد روز: {program.days_per_week}</p>
            '''
            for day in program.days.all():
                html_content += f'<h2>روز {day.day_index} {day.label or ""}</h2>'
                html_content += '<table><tr><th>ردیف</th><th>حرکت</th><th>دسته</th><th>ست</th><th>تکرار</th><th>استراحت</th><th>یادداشت</th></tr>'
                for idx, item in enumerate(day.items.all(), 1):
                    html_content += f'<tr><td>{idx}</td><td>{item.exercise.name}</td><td>{item.exercise.category.name}</td><td>{item.sets}</td><td>{item.reps}</td><td>{item.rest_seconds or ""}</td><td>{item.note or ""}</td></tr>'
                html_content += '</table>'
            html_content += '<div class="footer">Physique | قدرت از انضباط شروع می‌شود</div></body></html>'
            if HTML:
                pdf = HTML(string=html_content, base_url='/').write_pdf()
                response = HttpResponse(pdf, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="physique_program_{program.id}.pdf"'
                return response
            return Response({'detail': 'خطا در تولید PDF'}, status=500)
        except Exception as e:
            return Response({'detail': 'خطا در تولید PDF'}, status=500)
