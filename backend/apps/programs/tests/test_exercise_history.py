from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.athletes.models import Athlete
from apps.library.models import Category, Exercise
from apps.programs.models import Program, ProgramDay, ProgramItem

User = get_user_model()


class ExerciseHistoryTest(TestCase):
    """GET /api/athletes/{id}/exercise_history/"""

    def setUp(self):
        self.coach = User.objects.create_user(
            'coach', 'c@test.com', 'pass123456!', role='coach', is_approved=True
        )
        self.athlete = Athlete.objects.create(first_name='علی', last_name='رضایی', coach=self.coach)
        cat = Category.objects.create(name='سینه', order=1)
        self.ex = Exercise.objects.create(name='پرس سینه', category=cat)
        self.other_ex = Exercise.objects.create(name='کراس اور', category=cat)
        self.client = APIClient()
        self.client.force_authenticate(user=self.coach)

    def make_program(self, sequence, archived=False, status='final', date_=None,
                     days=(1,), exercise=None, sets='3', reps='10'):
        program = Program.objects.create(
            athlete=self.athlete, coach=self.coach, sequence_number=sequence,
            title=f'برنامه {sequence}',
            start_date=date_ or date(2026, 1, 1) + timedelta(days=31 * (sequence - 1)),
            days_per_week=len(days), status=status, is_archived=archived,
        )
        for index in days:
            day = ProgramDay.objects.create(program=program, day_index=index)
            ProgramItem.objects.create(
                program_day=day, exercise=exercise or self.ex, order=0, sets=sets, reps=reps,
            )
        return program

    def history(self, **params):
        params.setdefault('exercise_id', self.ex.id)
        query = '&'.join(f'{key}={value}' for key, value in params.items())
        return self.client.get(f'/api/athletes/{self.athlete.id}/exercise_history/?{query}')


    def test_ten_programs_return_count_ten_with_numbers(self):
        for sequence in range(1, 11):
            self.make_program(sequence, status='final' if sequence % 2 else 'draft')
        res = self.history()
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['count'], 10)
        self.assertEqual(len(res.data['programs']), 10)
        self.assertEqual([row['sequence_number'] for row in res.data['programs']], list(range(10, 0, -1)))
        self.assertEqual(res.data['last']['sequence_number'], 10)
        first = res.data['programs'][0]
        self.assertEqual(first['day_index'], 1)
        self.assertEqual(first['sets'], '3')
        self.assertEqual(first['reps'], '10')
        self.assertEqual(first['date'], '2026-10-07')
        self.assertEqual(first['date_jalali'], '15 مهر 1405')
        self.assertEqual(res.data['last'], first)

    def test_draft_is_counted(self):
        self.make_program(1, status='final')
        self.make_program(2, status='draft')
        res = self.history()
        self.assertEqual(res.data['count'], 2)
        self.assertEqual(res.data['last']['sequence_number'], 2)

    def test_archived_programs_are_ignored(self):
        self.make_program(1)
        self.make_program(2, archived=True)
        res = self.history()
        self.assertEqual(res.data['count'], 1)
        self.assertEqual([row['sequence_number'] for row in res.data['programs']], [1])

    def test_other_students_are_ignored(self):
        kept = self.make_program(1)
        other_athlete = Athlete.objects.create(first_name='م', last_name='ن', coach=self.coach)
        program = Program.objects.create(
            athlete=other_athlete, coach=self.coach, sequence_number=1, title='دیگری',
            start_date=date(2026, 2, 1), days_per_week=1,
        )
        day = ProgramDay.objects.create(program=program, day_index=1)
        ProgramItem.objects.create(program_day=day, exercise=self.ex, order=0)
        res = self.history()
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['programs'][0]['id'], kept.id)

    def test_exercise_without_history_returns_zero(self):
        self.make_program(1)
        res = self.history(exercise_id=self.other_ex.id)
        self.assertEqual(res.data, {'count': 0, 'last': None, 'programs': []})

    def test_exclude_program_removes_the_open_draft(self):
        for sequence in (1, 2, 3):
            self.make_program(sequence)
        excluded = Program.objects.get(athlete=self.athlete, sequence_number=3)
        res = self.history(exclude_program=excluded.id)
        self.assertEqual(res.data['count'], 2)
        self.assertEqual(res.data['last']['sequence_number'], 2)

    def test_one_row_per_program_keeps_the_first_day(self):
        program = self.make_program(1, days=(1, 3), sets='4', reps='8-12')
        res = self.history()
        self.assertEqual(res.data['count'], 1)
        row = res.data['programs'][0]
        self.assertEqual(row['id'], program.id)
        self.assertEqual((row['day_index'], row['sets'], row['reps']), (1, '4', '8-12'))

    def test_missing_exercise_id_is_a_400(self):
        res = self.client.get(f'/api/athletes/{self.athlete.id}/exercise_history/')
        self.assertEqual(res.status_code, 400)

    def test_other_coach_cannot_read_history(self):
        self.make_program(1)
        other_coach = User.objects.create_user(
            'coach2', 'c2@test.com', 'pass123456!', role='coach', is_approved=True
        )
        client = APIClient()
        client.force_authenticate(user=other_coach)
        res = client.get(f'/api/athletes/{self.athlete.id}/exercise_history/?exercise_id={self.ex.id}')
        self.assertEqual(res.status_code, 404)

    def test_duplicate_check_agrees_with_history(self):
        for sequence in (1, 2, 3):
            self.make_program(sequence)
        res = self.client.get(
            f'/api/programs/duplicate_check/?athlete_id={self.athlete.id}&exercise_id={self.ex.id}'
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data['duplicate'])
        self.assertTrue(res.data['used'])
        self.assertEqual(res.data['count'], 3)
        self.assertEqual(res.data['sequence_number'], 3)

    def test_history_uses_one_query(self):
        for sequence in range(1, 6):
            self.make_program(sequence, days=(1, 2))
        with self.assertNumQueries(2):  # session/user lookup + the history query
            res = self.history()
        self.assertEqual(res.data['count'], 5)

    def test_repeat_counts_for_badges(self):
        for sequence in (1, 2, 3):
            self.make_program(sequence)
        fourth = self.make_program(4)
        res = self.client.get(f'/api/athletes/{self.athlete.id}/repeat_counts/?exercise_ids={self.ex.id}')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['counts'][str(self.ex.id)], 4)
        res = self.client.get(
            f'/api/athletes/{self.athlete.id}/repeat_counts/'
            f'?exercise_ids={self.ex.id}&exclude_program={fourth.id}'
        )
        self.assertEqual(res.data['counts'][str(self.ex.id)], 3)

    def test_frequent_exercises_ranks_and_limits(self):
        cat = Category.objects.get(name='سینه')
        a = Exercise.objects.create(name='الف', category=cat)
        b = Exercise.objects.create(name='ب', category=cat)
        c = Exercise.objects.create(name='ج', category=cat)
        plan = {1: [a, b, c], 2: [a, b], 3: [a]}
        for sequence, exercises in plan.items():
            program = self.make_program(sequence, exercise=exercises[0], date_=date(2026, 1, 1))
            day = program.days.first()
            for order, exercise in enumerate(exercises[1:], start=1):
                ProgramItem.objects.create(program_day=day, exercise=exercise, order=order)
        res = self.client.get(f'/api/athletes/{self.athlete.id}/frequent_exercises/')
        self.assertEqual(res.status_code, 200, res.data)
        rows = res.data['exercises']
        self.assertEqual([row['name'] for row in rows], ['الف', 'ب', 'ج'])
        self.assertEqual([row['count'] for row in rows], [3, 2, 1])
        self.assertEqual(rows[0]['exercise_id'], a.id)
        self.assertEqual(rows[0]['last_sequence_number'], 3)
        self.assertTrue(rows[0]['last_date_jalali'])
