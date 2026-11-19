from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem

User = get_user_model()


def rows(response):
    data = response.data
    return data['results'] if isinstance(data, dict) and 'results' in data else data


class LibraryRuleBase(TestCase):
    def setUp(self):
        self.coach = User.objects.create_user('coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True)
        self.other_coach = User.objects.create_user('coach2', 'c2@test.com', 'pass123456!', role='coach', is_approved=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.coach)
        self.chest = Category.objects.create(name='سینه', order=0)
        self.back = Category.objects.create(name='پشت', order=1)
        self.exercise = Exercise.objects.create(name='پرس سینه', category=self.chest)

    def make_program(self, athlete=None, exercise=None, title='برنامه'):
        athlete = athlete or Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.coach)
        program = Program.objects.create(
            athlete=athlete, coach=self.coach, title=title,
            start_date=date.today(), days_per_week=1,
        )
        day = ProgramDay.objects.create(program=program, day_index=1)
        ProgramItem.objects.create(program_day=day, exercise=exercise or self.exercise, order=0)
        return program


class CategoryRuleTests(LibraryRuleBase):
    def test_name_is_trimmed_and_required(self):
        res = self.client.post('/api/library/categories/', {'name': '   سرشانه  '})
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['name'], 'سرشانه')
        self.assertEqual(self.client.post('/api/library/categories/', {'name': '   '}).status_code, 400)

    def test_name_max_fifty_characters(self):
        self.assertEqual(self.client.post('/api/library/categories/', {'name': 'ا' * 51}).status_code, 400)
        self.assertEqual(self.client.post('/api/library/categories/', {'name': 'ا' * 50}).status_code, 201)

    def test_unique_name_with_persian_normalization(self):
        self.client.post('/api/library/categories/', {'name': 'سینه'})
        # Arabic ی/ك + ZWNJ and spaces must collide with the stored name.
        res = self.client.post('/api/library/categories/', {'name': 'سينه'})
        self.assertEqual(res.status_code, 400)
        res = self.client.post('/api/library/categories/', {'name': 'پـشت'})
        self.assertEqual(res.status_code, 201)

    def test_rename_keeps_uniqueness_but_allows_same_row(self):
        self.assertEqual(self.client.patch(f'/api/library/categories/{self.chest.id}/', {'name': 'سینه'}).status_code, 200)
        res = self.client.patch(f'/api/library/categories/{self.chest.id}/', {'name': 'پشت'})
        self.assertEqual(res.status_code, 400)

    def test_reorder_all_persists_drag_order(self):
        res = self.client.post('/api/library/categories/reorder-all/', {'order': [self.back.id, self.chest.id]}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.chest.refresh_from_db()
        self.back.refresh_from_db()
        self.assertEqual(self.back.order, 0)
        self.assertEqual(self.chest.order, 1)

    def test_disable_hides_category_from_builder_list_only(self):
        res = self.client.post(f'/api/library/categories/{self.chest.id}/deactivate/')
        self.assertEqual(res.status_code, 200)
        ids = [row['id'] for row in rows(self.client.get('/api/library/categories/'))]
        self.assertNotIn(self.chest.id, ids)
        ids = [row['id'] for row in rows(self.client.get('/api/library/categories/?include_inactive=1'))]
        self.assertIn(self.chest.id, ids)
        # old programmes still resolve the category on the exercise payload
        self.assertEqual(self.client.get(f'/api/library/categories/{self.chest.id}/').status_code, 200)
        self.client.post(f'/api/library/categories/{self.chest.id}/activate/')
        ids = [row['id'] for row in rows(self.client.get('/api/library/categories/'))]
        self.assertIn(self.chest.id, ids)

    def test_delete_with_exercises_is_blocked_with_409(self):
        res = self.client.delete(f'/api/library/categories/{self.chest.id}/')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data['exercise_count'], 1)
        self.assertTrue(Category.objects.filter(pk=self.chest.id).exists())

    def test_move_exercises_then_delete(self):
        res = self.client.post(f'/api/library/categories/{self.chest.id}/delete_and_move/', {'move_to': self.back.id})
        self.assertEqual(res.status_code, 200, res.data)
        self.exercise.refresh_from_db()
        self.assertEqual(self.exercise.category_id, self.back.id)
        self.assertFalse(Category.objects.filter(pk=self.chest.id).exists())

    def test_library_is_shared_between_coaches(self):
        second = APIClient()
        second.force_authenticate(user=self.other_coach)
        ids = [row['id'] for row in rows(second.get('/api/library/categories/'))]
        self.assertIn(self.chest.id, ids)
        self.assertEqual(second.patch(f'/api/library/exercises/{self.exercise.id}/', {'description': 'مشترک'}).status_code, 200)



class ExerciseRuleTests(LibraryRuleBase):
    def test_usage_count_counts_distinct_programs(self):
        athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.coach)
        first = self.make_program(athlete=athlete)
        second = self.make_program(athlete=athlete, title='دوم')
        # same exercise twice in one programme still counts once
        ProgramItem.objects.create(program_day=second.days.first(), exercise=self.exercise, order=1)
        res = self.client.get(f'/api/library/exercises/{self.exercise.id}/')
        self.assertEqual(res.data['usage_count'], 2)
        self.assertEqual(res.data['usage_count_items'], 3)
        self.assertEqual(first.sequence_number, 1)
        self.assertEqual(second.sequence_number, 2)

    def test_hard_delete_is_rejected_when_used(self):
        self.make_program()
        res = self.client.delete(f'/api/library/exercises/{self.exercise.id}/')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data['usage_count'], 1)
        self.assertIn('برنامه', res.data['detail'])
        self.assertTrue(Exercise.objects.filter(pk=self.exercise.id).exists())

    def test_unused_exercise_can_be_hard_deleted(self):
        self.assertEqual(self.client.delete(f'/api/library/exercises/{self.exercise.id}/').status_code, 204)
        self.assertFalse(Exercise.objects.filter(pk=self.exercise.id).exists())

    def test_disable_and_enable(self):
        self.client.post(f'/api/library/exercises/{self.exercise.id}/deactivate/')
        self.exercise.refresh_from_db()
        self.assertFalse(self.exercise.is_active)
        ids = [row['id'] for row in rows(self.client.get('/api/library/exercises/'))]
        self.assertNotIn(self.exercise.id, ids)
        ids = [row['id'] for row in rows(self.client.get('/api/library/exercises/?include_inactive=1'))]
        self.assertIn(self.exercise.id, ids)
        self.client.post(f'/api/library/exercises/{self.exercise.id}/activate/')
        self.exercise.refresh_from_db()
        self.assertTrue(self.exercise.is_active)

    def test_move_exercise_to_another_category(self):
        res = self.client.post(f'/api/library/exercises/{self.exercise.id}/move/', {'category': self.back.id})
        self.assertEqual(res.status_code, 200, res.data)
        self.exercise.refresh_from_db()
        self.assertEqual(self.exercise.category_id, self.back.id)

    def test_search_tolerates_persian_variants_and_zwnj(self):
        Exercise.objects.create(name='پرس سينه هالتر', category=self.chest)
        qs = self.client.get('/api/library/exercises/?search=پرس سینه')
        names = [row['name'] for row in rows(qs)]
        self.assertEqual(sorted(names), sorted(['پرس سینه', 'پرس سينه هالتر']))
        self.assertEqual(rows(self.client.get('/api/library/exercises/?search=هالتر'))[0]['name'], 'پرس سينه هالتر')

    def test_similar_name_warning_without_blocking_create(self):
        res = self.client.get('/api/library/exercises/check-duplicate/?name=پرس سينه')
        self.assertTrue(res.data['exists'])
        res = self.client.get('/api/library/exercises/check-duplicate/?name=پرس سینه دمبل')
        self.assertFalse(res.data['exists'])
        self.assertIn('پرس سینه', res.data['similar'])
        created = self.client.post('/api/library/exercises/', {'name': 'پرس سینه دمبل', 'category': self.chest.id})
        self.assertEqual(created.status_code, 201)

    def test_exercise_requires_a_category(self):
        self.assertEqual(self.client.post('/api/library/exercises/', {'name': 'بدون دسته'}).status_code, 400)

    def test_exercise_used_in_template_cannot_be_deleted(self):
        from apps.program_templates.models import ProgramTemplate, ProgramTemplateDay, ProgramTemplateItem

        template = ProgramTemplate.objects.create(name='قالب', coach=self.coach)
        day = ProgramTemplateDay.objects.create(template=template, day_index=1)
        ProgramTemplateItem.objects.create(template_day=day, exercise=self.exercise, order=0)
        res = self.client.delete(f'/api/library/exercises/{self.exercise.id}/')
        self.assertEqual(res.status_code, 409)
        self.assertTrue(res.data['used_in_templates'])
        self.assertTrue(Exercise.objects.filter(pk=self.exercise.id).exists())

    def test_anonymous_is_rejected(self):
        self.assertEqual(APIClient().get('/api/library/exercises/').status_code, 401)
