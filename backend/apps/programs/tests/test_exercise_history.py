from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem
from rest_framework.test import APIClient
from datetime import date

User = get_user_model()


class ExerciseHistoryTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True)
        self.athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.user)
        cat = Category.objects.create(name='سینه', order=1)
        self.ex = Exercise.objects.create(name='پرس سینه', category=cat)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        p1 = Program.objects.create(athlete=self.athlete, coach=self.user, sequence_number=1, title='مهر', start_date=date(2025,9,23), days_per_week=3)
        d1 = ProgramDay.objects.create(program=p1, day_index=1)
        ProgramItem.objects.create(program_day=d1, exercise=self.ex, order=0)

    def test_user_specific_history(self):
        # different user
        u2 = User.objects.create_user('coach2', 'c2@test.com', 'pass123456!', role='coach', is_approved=True)
        a2 = Athlete.objects.create(first_name='م', last_name='ن', coach=u2)
        cat = Category.objects.first()
        ex2 = Exercise.objects.create(name='پرس سینه', category=cat)
        p2 = Program.objects.create(athlete=a2, coach=u2, sequence_number=1, title='مهر', start_date=date(2025,9,23), days_per_week=3)
        d2 = ProgramDay.objects.create(program=p2, day_index=1)
        ProgramItem.objects.create(program_day=d2, exercise=ex2, order=0)
        # check for a2 - should find, for self.athlete different
        res = self.client.get(f'/api/programs/exercise_history/?athlete_id={self.athlete.id}&exercise_id={self.ex.id}')
        self.assertTrue(res.data.get('used'))
