from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.library.models import Category, Exercise
from apps.athletes.models import Athlete
from apps.programs.models import Program, ProgramDay, ProgramItem
from rest_framework.test import APIClient
from datetime import date

User = get_user_model()


class LibraryFullTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('c','c@c.com','pass123456!',role='coach',is_approved=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.cat1 = Category.objects.create(name='سینه', order=1)
        self.cat2 = Category.objects.create(name='پشت', order=2)

    def test_rename_category(self):
        res = self.client.patch(f'/api/library/categories/{self.cat1.id}/', {'name': 'سینه جدید'})
        self.assertEqual(res.status_code, 200)

    def test_duplicate_category_name(self):
        res = self.client.post('/api/library/categories/', {'name': 'سینه'})
        self.assertIn(res.status_code, [400])

    def test_delete_empty_category(self):
        cat = Category.objects.create(name='خالی', order=3)
        res = self.client.delete(f'/api/library/categories/{cat.id}/')
        self.assertIn(res.status_code, [204, 200])

    def test_delete_category_with_exercises_returns_409(self):
        ex = Exercise.objects.create(name='پرس', category=self.cat1)
        res = self.client.delete(f'/api/library/categories/{self.cat1.id}/')
        self.assertEqual(res.status_code, 409)
        self.assertIn('exercise_count', res.data)

    def test_move_and_delete_category(self):
        ex = Exercise.objects.create(name='پرس', category=self.cat1)
        res = self.client.post(f'/api/library/categories/{self.cat1.id}/delete_and_move/', {'move_to': self.cat2.id})
        self.assertIn(res.status_code, [200])
        ex.refresh_from_db()
        self.assertEqual(ex.category_id, self.cat2.id)

    def test_archive_exercise_if_used(self):
        athlete = Athlete.objects.create(first_name='a', last_name='b', coach=self.user)
        ex = Exercise.objects.create(name='حرکت تست', category=self.cat1)
        p = Program.objects.create(athlete=athlete, coach=self.user, sequence_number=1, title='ت', start_date=date.today(), days_per_week=1)
        day = ProgramDay.objects.create(program=p, day_index=1)
        ProgramItem.objects.create(program_day=day, exercise=ex, order=0)
        res = self.client.delete(f'/api/library/exercises/{ex.id}/')
        ex.refresh_from_db()
        self.assertFalse(ex.is_active)

    def test_restore_exercise(self):
        ex = Exercise.objects.create(name='حرکت', category=self.cat1, is_active=False)
        res = self.client.post(f'/api/library/exercises/{ex.id}/restore/')
        self.assertEqual(res.status_code, 200)
