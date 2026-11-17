from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem
from apps.program_templates.models import ProgramTemplate, ProgramTemplateDay, ProgramTemplateItem

User = get_user_model()


class TemplateApiBase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True)
        self.other = User.objects.create_user('coach2', 'c2@test.com', 'pass123456!', role='coach', is_approved=True)
        self.athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.user)
        self.cat = Category.objects.create(name='سینه', order=1)
        self.ex = Exercise.objects.create(name='پرس سینه', category=self.cat)
        self.ex2 = Exercise.objects.create(name='کراس اور', category=self.cat)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.template = ProgramTemplate.objects.create(name='قالب سینه', coach=self.user, days_per_week=2)
        self.day = ProgramTemplateDay.objects.create(template=self.template, day_index=1, label='سینه')
        ProgramTemplateItem.objects.create(template_day=self.day, exercise=self.ex, order=0, sets='4', reps='12')

        self.other_template = ProgramTemplate.objects.create(name='قالب دیگر', coach=self.other)
        self.other_day = ProgramTemplateDay.objects.create(template=self.other_template, day_index=1)
        self.other_item = ProgramTemplateItem.objects.create(template_day=self.other_day, exercise=self.ex2, order=0)



class TemplateDayItemTest(TemplateApiBase):
    def test_create_day_and_item(self):
        res = self.client.post('/api/program-template-days/', {'template': self.template.id, 'day_index': 2, 'label': 'پشت'})
        self.assertEqual(res.status_code, 201, res.data)
        res = self.client.post('/api/program-template-items/', {
            'template_day': res.data['id'], 'exercise': self.ex2.id, 'order': 0, 'sets': '3', 'reps': '10',
        })
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['exercise_name'], 'کراس اور')
        self.assertEqual(ProgramTemplateDay.objects.filter(template=self.template).count(), 2)

    def test_patch_and_delete_item(self):
        item = self.day.items.first()
        res = self.client.patch(f'/api/program-template-items/{item.id}/', {'reps': '15'})
        self.assertEqual(res.status_code, 200, res.data)
        item.refresh_from_db()
        self.assertEqual(item.reps, '15')
        self.assertEqual(self.client.delete(f'/api/program-template-items/{item.id}/').status_code, 204)

    def test_cannot_touch_other_coach_template(self):
        self.assertEqual(self.client.get(f'/api/program-template-days/{self.other_day.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/program-template-items/{self.other_item.id}/').status_code, 404)
        res = self.client.post('/api/program-template-items/', {
            'template_day': self.other_day.id, 'exercise': self.ex.id, 'order': 0,
        })
        self.assertEqual(res.status_code, 400, res.data)

    def test_list_is_scoped_to_coach(self):
        res = self.client.get('/api/program-template-days/')
        rows = res.data['results'] if isinstance(res.data, dict) else res.data
        ids = [d['id'] for d in rows]
        self.assertIn(self.day.id, ids)
        self.assertNotIn(self.other_day.id, ids)


class TemplateQueryCountTest(TemplateApiBase):
    LIST_QUERIES = 5
    DETAIL_QUERIES = 4

    def _grow(self):
        t = ProgramTemplate.objects.create(name='قالب دوم', coach=self.user)
        for i in (1, 2):
            d = ProgramTemplateDay.objects.create(template=t, day_index=i)
            for j in range(3):
                ProgramTemplateItem.objects.create(template_day=d, exercise=self.ex, order=j)

    def test_list_query_count_does_not_grow(self):
        with self.assertNumQueries(self.LIST_QUERIES):
            self.client.get('/api/program-templates/')
        self._grow()
        with self.assertNumQueries(self.LIST_QUERIES):
            self.client.get('/api/program-templates/')

    def test_detail_query_count(self):
        with self.assertNumQueries(self.DETAIL_QUERIES):
            self.client.get(f'/api/program-templates/{self.template.id}/')


class ApplyTemplateTest(TemplateApiBase):
    def test_apply_to_athlete_copies_structure(self):
        res = self.client.post(f'/api/program-templates/{self.template.id}/apply-to-athlete/', {'athlete_id': self.athlete.id})
        self.assertEqual(res.status_code, 201, res.data)
        program = Program.objects.get(pk=res.data['program_id'])
        self.assertEqual(program.athlete, self.athlete)
        self.assertEqual(program.days_per_week, self.template.days_per_week)
        self.assertEqual(program.days.count(), 1)
        self.assertEqual(program.days.first().items.count(), 1)
        self.assertEqual(program.days.first().items.first().reps, '12')

    def test_apply_to_foreign_athlete_is_rejected(self):
        other_athlete = Athlete.objects.create(first_name='م', last_name='ن', coach=self.other)
        res = self.client.post(f'/api/program-templates/{self.template.id}/apply-to-athlete/', {'athlete_id': other_athlete.id})
        self.assertEqual(res.status_code, 404)

    def test_create_from_program(self):
        program = Program.objects.create(
            athlete=self.athlete, coach=self.user, sequence_number=1, title='مهر',
            start_date=date(2025, 9, 23), days_per_week=1,
        )
        day = ProgramDay.objects.create(program=program, day_index=1, label='سینه')
        ProgramItem.objects.create(program_day=day, exercise=self.ex, order=0, sets='5', reps='8')

        res = self.client.post('/api/program-templates/create-from-program/', {'program_id': program.id, 'name': 'کپی مهر'})
        self.assertEqual(res.status_code, 201, res.data)
        tpl = ProgramTemplate.objects.get(pk=res.data['id'])
        self.assertEqual(tpl.name, 'کپی مهر')
        self.assertEqual(tpl.days.first().items.first().sets, '5')

