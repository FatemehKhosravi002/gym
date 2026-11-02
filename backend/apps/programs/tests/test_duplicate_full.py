from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem
from rest_framework.test import APIClient
from datetime import date

User = get_user_model()


class DuplicateFullTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True)
        self.athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.user)
        cat = Category.objects.create(name='سینه', order=1)
        self.ex = Exercise.objects.create(name='پرس سینه', category=cat)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        # program 1
        p1 = Program.objects.create(athlete=self.athlete, coach=self.user, sequence_number=1, title='مهر', start_date=date(2025,9,23), days_per_week=3)
        d1 = ProgramDay.objects.create(program=p1, day_index=1)
        ProgramItem.objects.create(program_day=d1, exercise=self.ex, order=0)

    def test_duplicate_returns_most_recent(self):
        p2 = Program.objects.create(athlete=self.athlete, coach=self.user, sequence_number=2, title='آبان', start_date=date(2025,10,23), days_per_week=3)
        res = self.client.get(f'/api/programs/duplicate_check/?athlete_id={self.athlete.id}&exercise_id={self.ex.id}')
        self.assertTrue(res.data.get('duplicate') or res.data.get('used'))
        self.assertEqual(res.data.get('sequence_number'), 2)
