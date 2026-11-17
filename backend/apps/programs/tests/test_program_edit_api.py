from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem

User = get_user_model()


class ProgramEditApiTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True)
        self.other = User.objects.create_user('coach2', 'c2@test.com', 'pass123456!', role='coach', is_approved=True)
        self.athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.user)
        cat = Category.objects.create(name='سینه', order=1)
        self.ex = Exercise.objects.create(name='پرس سینه', category=cat)
        self.ex2 = Exercise.objects.create(name='کراس اور', category=cat)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.program = Program.objects.create(
            athlete=self.athlete, coach=self.user, sequence_number=1, title='مهر',
            start_date=date(2025, 9, 23), days_per_week=2,
        )
        self.day = ProgramDay.objects.create(program=self.program, day_index=1, label='سینه')
        self.item = ProgramItem.objects.create(program_day=self.day, exercise=self.ex, order=0, sets='3', reps='10')

        other_athlete = Athlete.objects.create(first_name='م', last_name='ن', coach=self.other)
        self.other_program = Program.objects.create(
            athlete=other_athlete, coach=self.other, sequence_number=1, title='مهر',
            start_date=date(2025, 9, 23), days_per_week=1,
        )
        self.other_day = ProgramDay.objects.create(program=self.other_program, day_index=1)
        self.other_item = ProgramItem.objects.create(program_day=self.other_day, exercise=self.ex2, order=0)

    def test_patch_program_header(self):
        res = self.client.patch(f'/api/programs/{self.program.id}/', {
            'title': 'مهر - نسخه دوم', 'start_date': '2025-09-25', 'days_per_week': 2, 'notes': 'توجه به فرم',
        })
        self.assertEqual(res.status_code, 200, res.data)
        self.program.refresh_from_db()
        self.assertEqual(self.program.title, 'مهر - نسخه دوم')
        self.assertEqual(self.program.notes, 'توجه به فرم')
        self.assertEqual(str(self.program.start_date), '2025-09-25')

    def test_edit_day_and_items(self):
        res = self.client.patch(f'/api/program-days/{self.day.id}/', {'label': 'سینه و پشت بازو'})
        self.assertEqual(res.status_code, 200, res.data)

        res = self.client.patch(f'/api/program-items/{self.item.id}/', {'sets': '4', 'reps': '8'})
        self.assertEqual(res.status_code, 200, res.data)

        res = self.client.post('/api/program-items/', {
            'program_day': self.day.id, 'exercise': self.ex2.id, 'order': 1, 'sets': '3', 'reps': '12',
        })
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(self.day.items.count(), 2)

        self.assertEqual(self.client.delete(f'/api/program-items/{self.item.id}/').status_code, 204)

    def test_cannot_touch_other_coach_program(self):
        self.assertEqual(self.client.get(f'/api/program-days/{self.other_day.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/program-items/{self.other_item.id}/').status_code, 404)
        res = self.client.post('/api/program-days/', {'program': self.other_program.id, 'day_index': 2})
        self.assertEqual(res.status_code, 400, res.data)

    def test_day_list_filtered_by_program(self):
        res = self.client.get(f'/api/program-days/?program={self.program.id}')
        rows = res.data['results'] if isinstance(res.data, dict) else res.data
        self.assertEqual([d['id'] for d in rows], [self.day.id])

    def test_program_detail_query_count(self):
        with self.assertNumQueries(5):
            self.client.get(f'/api/programs/{self.program.id}/')

    def test_program_list_query_count_does_not_grow(self):
        with self.assertNumQueries(6):
            self.client.get('/api/programs/')
        extra = Program.objects.create(
            athlete=self.athlete, coach=self.user, sequence_number=2, title='آبان',
            start_date=date(2025, 10, 23), days_per_week=1,
        )
        extra_day = ProgramDay.objects.create(program=extra, day_index=1)
        ProgramItem.objects.create(program_day=extra_day, exercise=self.ex2, order=0)
        with self.assertNumQueries(6):
            self.client.get('/api/programs/')
