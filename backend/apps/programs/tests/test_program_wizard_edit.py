from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem

User = get_user_model()


class ProgramWizardEditTest(TestCase):
    """PATCH /api/programs/{id}/ saves the header + days + items in one transaction."""

    def setUp(self):
        self.coach = User.objects.create_user('coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True)
        self.other = User.objects.create_user('coach2', 'c2@test.com', 'pass123456!', role='coach', is_approved=True)
        self.athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.coach)
        category = Category.objects.create(name='سینه', order=1)
        self.press = Exercise.objects.create(name='پرس سینه', category=category)
        self.fly = Exercise.objects.create(name='کراس اور', category=category)
        self.program = Program.objects.create(
            athlete=self.athlete, coach=self.coach, sequence_number=3, title='مهر',
            start_date=date(2025, 9, 23), days_per_week=2, status='final',
        )
        self.day = ProgramDay.objects.create(program=self.program, day_index=1, label='سینه')
        self.item = ProgramItem.objects.create(program_day=self.day, exercise=self.press, order=0, sets='3', reps='10')
        self.client = APIClient()
        self.client.force_authenticate(user=self.coach)
        self.token = self.program.share_token
        self.updated_at = self.program.updated_at

    def test_nested_patch_updates_days_and_keeps_identity(self):
        res = self.client.patch(f'/api/programs/{self.program.id}/', {
            'title': 'مهر - بازنویسی',
            'days': [
                {
                    'id': self.day.id,
                    'day_index': 1,
                    'label': 'سینه و پشت بازو',
                    'items': [
                        {'id': self.item.id, 'exercise': self.press.id, 'order': 0, 'sets': '4', 'reps': '8'},
                        {'exercise': self.fly.id, 'order': 1, 'sets': '12', 'reps': '15', 'superset_group': 1},
                    ],
                },
                {'day_index': 2, 'label': 'پا', 'items': [
                    {'exercise': self.press.id, 'order': 0, 'sets': '5', 'reps': '5'},
                ]},
            ],
        }, format='json')

        self.assertEqual(res.status_code, 200, res.data)
        self.program.refresh_from_db()
        self.assertEqual(self.program.title, 'مهر - بازنویسی')
        self.assertEqual(self.program.sequence_number, 3)
        self.assertEqual(self.program.share_token, self.token)
        self.assertGreater(self.program.updated_at, self.updated_at)
        self.assertEqual(self.program.days.count(), 2)
        self.assertEqual(self.program.days.get(day_index=1).items.count(), 2)
        self.assertEqual(self.program.days.get(day_index=1).items.get(id=self.item.id).sets, '4')

    def test_nested_patch_rejects_other_coach(self):
        client = APIClient()
        client.force_authenticate(user=self.other)
        res = client.patch(f'/api/programs/{self.program.id}/', {'title': 'دزدی'}, format='json')
        self.assertNotFoundOrForbidden(res.status_code)

    def test_nested_patch_rolls_back_on_invalid_day(self):
        res = self.client.patch(f'/api/programs/{self.program.id}/', {
            'title': 'تغییر نام',
            'days': [{'day_index': 9, 'items': []}],
        }, format='json')
        self.assertEqual(res.status_code, 400, res.data)
        self.program.refresh_from_db()
        self.assertEqual(self.program.title, 'مهر')
        self.assertEqual(self.program.days.count(), 1)

    def assertNotFoundOrForbidden(self, status_code):
        self.assertIn(status_code, (403, 404))

    def test_share_marks_and_regenerate_invalidates_old_link(self):
        res = self.client.post(f'/api/programs/{self.program.id}/share/')
        self.assertEqual(res.status_code, 200, res.data)
        self.program.refresh_from_db()
        self.assertIsNotNone(self.program.shared_at)

        old_token = self.program.share_token
        self.assertEqual(APIClient().get(f'/api/programs/public/{old_token}/').status_code, 200)

        res = self.client.post(f'/api/programs/{self.program.id}/regenerate_token/')
        self.assertEqual(res.status_code, 200, res.data)
        self.program.refresh_from_db()
        self.assertNotEqual(self.program.share_token, old_token)
        self.assertIsNone(self.program.shared_at)
        self.assertEqual(APIClient().get(f'/api/programs/public/{old_token}/').status_code, 404)
        self.assertEqual(APIClient().get(f'/api/programs/public/{self.program.share_token}/').status_code, 200)

    def test_deleted_program_share_link_is_404(self):
        token = self.program.share_token
        self.assertEqual(self.client.delete(f'/api/programs/{self.program.id}/').status_code, 204)
        self.assertEqual(APIClient().get(f'/api/programs/public/{token}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/programs/{self.program.id}/').status_code, 404)
