from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem
from datetime import date


class DuplicateCheckTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user('coach', 'c@test.com', 'pass')
        self.athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.user)
        cat = Category.objects.create(name='سینه', order=1)
        self.ex = Exercise.objects.create(name='پرس سینه', category=cat)
        self.p = Program.objects.create(athlete=self.athlete, coach=self.user, sequence_number=1, title='مهر', start_date=date.today(), days_per_week=3)
        day = ProgramDay.objects.create(program=self.p, day_index=1)
        ProgramItem.objects.create(program_day=day, exercise=self.ex, order=0)

    def test_duplicate_check_finds(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.get(f'/api/programs/duplicate_check/?athlete_id={self.athlete.id}&exercise_id={self.ex.id}')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('used'))
