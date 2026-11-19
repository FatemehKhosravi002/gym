from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem
from apps.program_templates.models import ProgramTemplate, ProgramTemplateDay, ProgramTemplateItem

User = get_user_model()


def rows(response):
    data = response.data
    return data['results'] if isinstance(data, dict) and 'results' in data else data


class TemplateRuleBase(TestCase):
    def setUp(self):
        self.coach = User.objects.create_user('coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True)
        self.other = User.objects.create_user('coach2', 'c2@test.com', 'pass123456!', role='coach', is_approved=True)
        self.athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.coach)
        self.foreign_athlete = Athlete.objects.create(first_name='مریم', last_name='نادری', coach=self.other)
        self.cat = Category.objects.create(name='سینه', order=0)
        self.ex = Exercise.objects.create(name='پرس سینه', category=self.cat)
        self.ex2 = Exercise.objects.create(name='کراس اور', category=self.cat)
        self.template = ProgramTemplate.objects.create(name='قالب سینه', coach=self.coach, days_per_week=2)
        self.day = ProgramTemplateDay.objects.create(template=self.template, day_index=1, label='سینه')
        self.item = ProgramTemplateItem.objects.create(
            template_day=self.day, exercise=self.ex, order=0, sets='4', reps='12',
        )
        self.foreign_template = ProgramTemplate.objects.create(name='قالب دیگر', coach=self.other)
        self.foreign_day = ProgramTemplateDay.objects.create(template=self.foreign_template, day_index=1)
        ProgramTemplateItem.objects.create(template_day=self.foreign_day, exercise=self.ex2, order=0)
        self.client = APIClient()
        self.client.force_authenticate(user=self.coach)

    def apply(self, template=None, athlete=None, **extra):
        return self.client.post(
            f'/api/program-templates/{(template or self.template).id}/apply-to-athlete/',
            {'athlete_id': (athlete or self.athlete).id, **extra},
        )


class TemplateCrudRuleTests(TemplateRuleBase):
    def test_rename_trims_and_rejects_blank(self):
        res = self.client.patch(f'/api/program-templates/{self.template.id}/', {'name': '  قالب حجم  '})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['name'], 'قالب حجم')
        self.assertEqual(self.client.patch(f'/api/program-templates/{self.template.id}/', {'name': '   '}).status_code, 400)

    def test_duplicate_is_an_independent_deep_copy(self):
        res = self.client.post(f'/api/program-templates/{self.template.id}/duplicate/')
        self.assertEqual(res.status_code, 201, res.data)
        copy = ProgramTemplate.objects.get(pk=res.data['id'])
        self.assertEqual(copy.name, 'کپی قالب سینه')
        self.assertEqual(copy.days.first().items.first().reps, '12')

        copy_item = copy.days.first().items.first()
        copy_item.reps = '20'
        copy_item.save()
        self.item.refresh_from_db()
        self.assertEqual(self.item.reps, '12')

        copy.delete()
        self.assertTrue(ProgramTemplate.objects.filter(pk=self.template.id).exists())

    def test_delete_is_soft_and_can_be_undone(self):
        res = self.client.delete(f'/api/program-templates/{self.template.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertTrue(ProgramTemplate.objects.filter(pk=self.template.id).exists())
        ids = [row['id'] for row in rows(self.client.get('/api/program-templates/'))]
        self.assertNotIn(self.template.id, ids)
        restore = self.client.post(f'/api/program-templates/{self.template.id}/restore/')
        self.assertEqual(restore.status_code, 200, restore.data)
        ids = [row['id'] for row in rows(self.client.get('/api/program-templates/'))]
        self.assertIn(self.template.id, ids)

    def test_other_coach_cannot_touch_my_template(self):
        self.client.force_authenticate(user=self.other)
        self.assertEqual(self.client.get(f'/api/program-templates/{self.template.id}/').status_code, 404)
        self.assertEqual(self.client.patch(f'/api/program-templates/{self.template.id}/', {'name': 'x'}).status_code, 404)
        self.assertEqual(self.client.delete(f'/api/program-templates/{self.template.id}/').status_code, 404)
        self.assertEqual(self.client.post(f'/api/program-templates/{self.template.id}/duplicate/').status_code, 404)
        self.assertEqual(self.client.post(f'/api/program-templates/{self.template.id}/restore/').status_code, 404)
        ids = [row['id'] for row in rows(self.client.get('/api/program-templates/'))]
        self.assertEqual(ids, [self.foreign_template.id])

    def test_list_payload_has_counts_for_cards(self):
        row = next(r for r in rows(self.client.get('/api/program-templates/')) if r['id'] == self.template.id)
        self.assertEqual(row['days_count'], 1)
        self.assertEqual(row['items_count'], 1)


class ApplyTemplateRuleTests(TemplateRuleBase):
    def test_apply_returns_an_independent_draft(self):
        res = self.apply(title='برنامه مهر', start_date='2025-09-23')
        self.assertEqual(res.status_code, 201, res.data)
        program = Program.objects.get(pk=res.data['program_id'])
        self.assertEqual(program.status, Program.STATUS_DRAFT)
        self.assertEqual(program.title, 'برنامه مهر')
        self.assertEqual(str(program.start_date), '2025-09-23')
        self.assertEqual(res.data['program']['id'], program.id)
        self.assertEqual(res.data['program']['status'], 'draft')

        # later edits to the template must not leak into the programme
        self.item.reps = '30'
        self.item.save()
        self.assertEqual(program.days.first().items.first().reps, '12')

        # and the other way round
        ProgramItem.objects.filter(program_day__program=program).update(sets='9')
        self.item.refresh_from_db()
        self.assertEqual(self.item.sets, '4')

        second = self.apply()
        self.assertNotEqual(second.data['program_id'], program.id)
        self.assertEqual(Program.objects.filter(athlete=self.athlete).count(), 2)
        self.assertNotEqual(
            second.data['items'][0]['program_item_id'],
            res.data['items'][0]['program_item_id'],
        )

    def test_apply_marks_disabled_exercises(self):
        self.ex.is_active = False
        self.ex.save(update_fields=['is_active'])
        res = self.apply()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data['has_disabled_exercises'])
        self.assertTrue(res.data['items'][0]['is_disabled'])

    def test_apply_reports_previous_history_of_the_student(self):
        old = Program.objects.create(
            athlete=self.athlete, coach=self.coach, title='قبلی',
            start_date=date(2025, 1, 1), days_per_week=1, status=Program.STATUS_FINAL,
        )
        ProgramDay.objects.create(program=old, day_index=1)
        ProgramItem.objects.create(program_day=old.days.first(), exercise=self.ex, order=0)

        res = self.apply()
        self.assertEqual(res.status_code, 201, res.data)
        hint = res.data['items'][0]
        self.assertTrue(res.data['has_history'])
        self.assertEqual(hint['repeat_count'], 1)
        self.assertEqual(hint['exercise_name'], 'پرس سینه')

    def test_apply_to_foreign_athlete_is_rejected(self):
        self.assertEqual(self.apply(athlete=self.foreign_athlete).status_code, 404)

    def test_save_program_as_template_copies_everything(self):
        program = Program.objects.create(
            athlete=self.athlete, coach=self.coach, title='برنامه مهر',
            start_date=date(2025, 9, 23), days_per_week=1,
        )
        day = ProgramDay.objects.create(program=program, day_index=1, label='سینه')
        ProgramItem.objects.create(program_day=day, exercise=self.ex, order=0, sets='5', reps='8')

        res = self.client.post('/api/program-templates/create-from-program/', {'program_id': program.id, 'name': ' قالب مهر '})
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['name'], 'قالب مهر')
        self.assertEqual(res.data['days'][0]['items'][0]['sets'], '5')
        self.assertEqual(res.data['days'][0]['label'], 'سینه')

    def test_cannot_save_foreign_program_as_template(self):
        program = Program.objects.create(
            athlete=self.foreign_athlete, coach=self.other, title='دیگری',
            start_date=date(2025, 9, 23), days_per_week=1,
        )
        res = self.client.post('/api/program-templates/create-from-program/', {'program_id': program.id})
        self.assertEqual(res.status_code, 404)

    def test_name_is_required_when_creating(self):
        self.assertEqual(self.client.post('/api/program-templates/', {'name': '  '}).status_code, 400)

        row = next(r for r in rows(self.client.get('/api/program-templates/')) if r['id'] == self.template.id)
        self.assertEqual(row['days_count'], 1)
        self.assertEqual(row['items_count'], 1)
