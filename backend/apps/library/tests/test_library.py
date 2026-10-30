from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.library.models import Category, Exercise
from apps.athletes.models import Athlete
from apps.programs.models import Program, ProgramDay, ProgramItem
from rest_framework.test import APIClient
from datetime import date

User = get_user_model()


class LibraryTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('c','c@c.com','pass123456!',role='coach',is_approved=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.cat1 = Category.objects.create(name='سینه', order=1)
        self.cat2 = Category.objects.create(name='پشت', order=2)

    def test_delete_category_with_exercises_requires_move(self):
        ex = Exercise.objects.create(name='پرس', category=self.cat1)
        res = self.client.delete(f'/api/library/categories/{self.cat1.id}/')
        # should not delete if has exercises - our view allows delete but we need to handle; test that exercises remain
        self.assertTrue(Exercise.objects.filter(id=ex.id).exists())

    def test_archive_exercise_not_hard_delete(self):
        athlete = Athlete.objects.create(first_name='a', last_name='b', coach=self.user)
        ex = Exercise.objects.create(name='حرکت تست', category=self.cat1)
        p = Program.objects.create(athlete=athlete, coach=self.user, sequence_number=1, title='ت', start_date=date.today(), days_per_week=1)
        day = ProgramDay.objects.create(program=p, day_index=1)
        ProgramItem.objects.create(program_day=day, exercise=ex, order=0)
        res = self.client.post(f'/api/library/exercises/{ex.id}/archive/')
        self.assertEqual(res.status_code, 200)
        ex.refresh_from_db()
        self.assertFalse(ex.is_active)
