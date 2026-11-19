from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem
from apps.programs.pdf import PDF_COLUMNS_CLASS, PDF_SLOGAN, build_html, render_pdf

User = get_user_model()

PRIVATE_NOTE = 'این یادداشت خصوصی مربی است و نباید در PDF چاپ شود'


class ProgramPdfTest(TestCase):
    def setUp(self):
        self.coach = User.objects.create_user('coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True)
        self.other = User.objects.create_user('coach2', 'c2@test.com', 'pass123456!', role='coach', is_approved=True)
        self.athlete = Athlete.objects.create(
            first_name='علی', last_name='رضایی', coach=self.coach, level='advanced', notes=PRIVATE_NOTE,
        )
        self.category = Category.objects.create(name='سینه', order=1)
        self.exercise = Exercise.objects.create(name='پرس سینه', category=self.category)
        self.exercise2 = Exercise.objects.create(name='کراس اور', category=self.category)
        self.program = Program.objects.create(
            athlete=self.athlete, coach=self.coach, sequence_number=1, title='برنامه مهر',
            start_date=date(2025, 9, 23), days_per_week=2, status='final',
        )
        self.day1 = ProgramDay.objects.create(program=self.program, day_index=1, label='سینه')
        ProgramItem.objects.create(program_day=self.day1, exercise=self.exercise, order=0, sets='3', reps='10', rest_seconds=60, note='فرم صحیح')
        ProgramItem.objects.create(program_day=self.day1, exercise=self.exercise2, order=1, sets='12', reps='12', superset_group=1)
        self.day2 = ProgramDay.objects.create(program=self.program, day_index=2, label='پا')
        ProgramItem.objects.create(program_day=self.day2, exercise=self.exercise, order=0, sets='4', reps='8')

        self.client = APIClient()
        self.client.force_authenticate(user=self.coach)

    def test_pdf_is_valid_and_embeds_sahel(self):
        res = self.client.get(f'/api/programs/{self.program.id}/pdf/')
        self.assertEqual(res.status_code, 200, res.content[:300])
        self.assertEqual(res['Content-Type'], 'application/pdf')
        self.assertTrue(res.content.startswith(b'%PDF'))
        self.assertGreater(len(res.content), 5000)
        self.assertIn('attachment;', res['Content-Disposition'])

        raw = render_pdf(self.program, uncompressed_pdf=True)
        self.assertIn(b'Sahel', raw)

    def test_two_column_layout_and_footer(self):
        html = build_html(self.program, 'https://physiquegym.ir/public/program/token')
        self.assertIn(f'class="{PDF_COLUMNS_CLASS}"', html)
        self.assertIn('column-count: 2', html)
        self.assertIn(PDF_SLOGAN, html)
        self.assertIn('سوپرست', html)
        self.assertNotIn(PRIVATE_NOTE, html)

    def test_deleted_program_is_404(self):
        self.client.delete(f'/api/programs/{self.program.id}/')
        self.program.refresh_from_db()
        self.assertIsNotNone(self.program.deleted_at)
        self.assertEqual(self.client.get(f'/api/programs/{self.program.id}/pdf/').status_code, 404)

    def test_public_pdf_works_and_dies_with_program(self):
        token = self.program.share_token
        res = APIClient().get(f'/api/programs/public/{token}/pdf/')
        self.assertEqual(res.status_code, 200, res.content[:300])
        self.assertTrue(res.content.startswith(b'%PDF'))
        self.client.delete(f'/api/programs/{self.program.id}/')
        self.assertEqual(APIClient().get(f'/api/programs/public/{token}/pdf/').status_code, 404)

    def test_other_coach_forbidden(self):
        client = APIClient()
        client.force_authenticate(user=self.other)
        res = client.get(f'/api/programs/{self.program.id}/pdf/')
        self.assertEqual(res.status_code, 403, res.content[:300])
