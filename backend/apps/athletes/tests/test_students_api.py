from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.athletes.models import Athlete, AthleteCodeArchive, Measurement
from apps.programs.models import Program

User = get_user_model()

BASE = '/api/athletes/'


class StudentApiBase(TestCase):
    def setUp(self):
        self.coach = User.objects.create_user('coach1', 'c1@test.com', 'pass12345', is_approved=True)
        self.other = User.objects.create_user('coach2', 'c2@test.com', 'pass12345', is_approved=True)
        self.client = APIClient()
        self.client.force_authenticate(self.coach)

    def make_athlete(self, first='محمد', last='احمدی', coach=None, **kwargs):
        athlete = Athlete.objects.create(first_name=first, last_name=last, coach=coach or self.coach, **kwargs)
        if kwargs.get('measurements'):
            pass
        return athlete

    def names(self, response):
        payload = response.json()
        rows = payload['results'] if isinstance(payload, dict) else payload
        return [row['last_name'] for row in rows]


class SearchTests(StudentApiBase):
    def test_search_is_character_and_zwnj_tolerant(self):
        self.make_athlete('علی', 'کریمی')
        self.make_athlete('سارا', 'محمدی‌نژاد')
        for query in ['کریمی', 'كريمي']:
            res = self.client.get(BASE, {'search': query})
            self.assertEqual(res.status_code, 200)
            self.assertEqual(self.names(res), ['کریمی'], query)
        res = self.client.get(BASE, {'search': 'محمدی نژاد'})
        self.assertEqual(self.names(res), ['محمدی‌نژاد'])
        res = self.client.get(BASE, {'search': 'سارا محمدی‌نژاد'})
        self.assertEqual(self.names(res), ['محمدی‌نژاد'])
        res = self.client.get(BASE, {'search': 'محمدینژاد'})
        self.assertEqual(self.names(res), ['محمدی‌نژاد'])

    def test_search_by_code_and_partial_name(self):
        athlete = self.make_athlete('رضا', 'حسینی')
        res = self.client.get(BASE, {'search': athlete.unique_code})
        self.assertEqual(self.names(res), ['حسینی'])
        res = self.client.get(BASE, {'search': 'حس'})
        self.assertEqual(self.names(res), ['حسینی'])

    def test_search_tolerates_small_typo(self):
        self.make_athlete('مریم', 'صادقی')
        res = self.client.get(BASE, {'search': 'صادغی'})
        self.assertEqual(self.names(res), ['صادقی'])

    def test_search_never_leaks_other_coach_students(self):
        self.make_athlete('محمد', 'غریبه', coach=self.other)
        res = self.client.get(BASE, {'search': 'غریبه'})
        self.assertEqual(self.names(res), [])

    def test_search_combined_action_still_works(self):
        self.make_athlete('حسن', 'نوری')
        res = self.client.get(BASE + 'search_combined/', {'q': 'نوري'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual([row['last_name'] for row in res.json()], ['نوری'])

    def test_search_by_code_with_persian_or_arabic_digits(self):
        athlete = self.make_athlete('کد', 'دیجیتال', phone='۰۹۱۲۳۴۵۶۷۸۹')
        persian = athlete.unique_code.translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
        arabic = athlete.unique_code.translate(str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩'))
        for query in (persian, arabic):
            res = self.client.get(BASE, {'search': query})
            self.assertEqual(self.names(res), ['دیجیتال'], query)
        self.assertEqual(self.names(self.client.get(BASE, {'search': '09123456789'})), ['دیجیتال'])

    def test_search_matches_note_tags(self):
        self.make_athlete('زخمی', 'زانو', note_tags=['آسیب زانو'])
        res = self.client.get(BASE, {'search': 'آسیب زانو'})
        self.assertEqual(self.names(res), ['زانو'])


class FilterTests(StudentApiBase):
    def setUp(self):
        super().setUp()
        self.beginner = self.make_athlete('الف', 'مبتدی', level=Athlete.LEVEL_BEGINNER)
        self.pro = self.make_athlete('ب', 'حرفه‌ای', level=Athlete.LEVEL_PRO, notes='آسیب زانو')
        self.tagged = self.make_athlete('ج', 'برچسبی', note_tags=['ممنوعیت حرکت خاص'])
        self.with_program = self.make_athlete('د', 'برنامه‌دار')
        Program.objects.create(
            athlete=self.with_program, coach=self.coach, sequence_number=1,
            title='برنامه یک', start_date=timezone.localdate() - timedelta(days=3),
        )
        self.old_active = self.make_athlete('ه', 'قدیمی‌فعال')
        Athlete.objects.filter(pk=self.old_active.pk).update(created_at=timezone.now() - timedelta(days=400))

    def test_level_filter(self):
        res = self.client.get(BASE, {'level': Athlete.LEVEL_PRO})
        self.assertEqual(self.names(res), ['حرفه‌ای'])

    def test_has_note_filter_counts_note_or_tags(self):
        res = self.client.get(BASE, {'has_note': '1', 'page_size': 50})
        self.assertEqual(sorted(self.names(res)), ['برچسبی', 'حرفه‌ای'])

    def test_has_programs_filter(self):
        res = self.client.get(BASE, {'has_programs': '1'})
        self.assertEqual(self.names(res), ['برنامه‌دار'])

    def test_recently_active_filter(self):
        res = self.client.get(BASE, {'active': '1', 'page_size': 50})
        self.assertNotIn('قدیمی‌فعال', self.names(res))
        self.assertIn('برنامه‌دار', self.names(res))

    def test_ordering_by_name_and_code(self):
        res = self.client.get(BASE, {'ordering': 'name', 'page_size': 50})
        self.assertEqual(self.names(res)[0], 'مبتدی')
        res = self.client.get(BASE, {'ordering': '-last_active'})
        self.assertEqual(res.status_code, 200)

    def test_ordering_by_last_program_puts_students_without_programs_last(self):
        rows = self.client.get(BASE, {'ordering': 'last_program', 'page_size': 50}).json()['results']
        self.assertEqual(rows[0]['last_name'], 'برنامه‌دار')
        self.assertIsNone(rows[-1]['last_program_date'])

    def test_list_card_payload(self):
        res = self.client.get(BASE, {'has_programs': '1'})
        row = res.json()['results'][0]
        for key in ['first_name', 'last_name', 'unique_code', 'level', 'level_display',
                    'has_note', 'last_program_date', 'programs_count']:
            self.assertIn(key, row)
        self.assertEqual(row['programs_count'], 1)
        self.assertTrue(row['last_program_date'])


class PermissionTests(StudentApiBase):
    def test_coach_cannot_read_or_write_other_coach_student(self):
        foreign = self.make_athlete('دیگر', 'مربی', coach=self.other)
        self.assertEqual(self.client.get(f'{BASE}{foreign.pk}/').status_code, 404)
        res = self.client.patch(f'{BASE}{foreign.pk}/', {'first_name': 'هک'}, format='json')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(self.client.delete(f'{BASE}{foreign.pk}/').status_code, 404)
        self.assertEqual(self.client.get(f'{BASE}{foreign.pk}/measurements/').status_code, 404)

    def test_list_only_returns_own_students(self):
        self.make_athlete('خودم', 'خودی')
        self.make_athlete('غیر', 'غیری', coach=self.other)
        self.assertEqual(self.names(self.client.get(BASE)), ['خودی'])

    def test_admin_sees_every_student(self):
        admin = User.objects.create_superuser('root', 'root@test.com', 'pass12345')
        self.client.force_authenticate(admin)
        self.make_athlete('خودم', 'خودی')
        self.make_athlete('غیر', 'غیری', coach=self.other)
        self.assertEqual(sorted(self.names(self.client.get(BASE))), ['خودی', 'غیری'])

    def test_measurement_delete_from_other_coach_blocked(self):
        foreign = self.make_athlete('دیگر', 'مربی', coach=self.other)
        m = Measurement.objects.create(athlete=foreign, date=timezone.localdate(), weight_kg=Decimal('70'))
        res = self.client.delete(f'{BASE}{foreign.pk}/measurements/{m.pk}/')
        self.assertEqual(res.status_code, 404)
        self.assertTrue(Measurement.objects.filter(pk=m.pk, deleted_at__isnull=True).exists())

    def test_measurement_patch_from_other_coach_blocked(self):
        foreign = self.make_athlete('دیگر', 'مربی', coach=self.other)
        m = Measurement.objects.create(athlete=foreign, date=timezone.localdate(), weight_kg=Decimal('70'))
        res = self.client.patch(f'{BASE}{foreign.pk}/measurements/{m.pk}/', {'weight_kg': '75'}, format='json')
        self.assertEqual(res.status_code, 404)
        m.refresh_from_db()
        self.assertEqual(m.weight_kg, Decimal('70'))

    def test_restore_and_purge_of_foreign_student_blocked(self):
        foreign = self.make_athlete('دیگر', 'مربی', coach=self.other)
        foreign.deleted_at = timezone.now()
        foreign.save(update_fields=['deleted_at'])
        self.assertEqual(self.client.post(f'{BASE}{foreign.pk}/restore/').status_code, 404)
        res = self.client.post(f'{BASE}{foreign.pk}/purge/', {'confirm_code': foreign.unique_code}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Athlete.objects.filter(pk=foreign.pk).exists())

    def test_deleted_student_is_hidden_from_measurements_api(self):
        own = self.make_athlete('حذف', 'شده')
        Measurement.objects.create(athlete=own, date=timezone.localdate(), weight_kg=Decimal('70'))
        self.assertEqual(self.client.delete(f'{BASE}{own.pk}/').status_code, 200)
        self.assertEqual(self.client.get(f'{BASE}{own.pk}/measurements/').status_code, 404)
        self.assertEqual(self.client.get(f'{BASE}{own.pk}/').status_code, 404)


class MeasurementTests(StudentApiBase):
    def setUp(self):
        super().setUp()
        self.athlete = self.make_athlete('اندازه', 'گیری')
        self.url = f'{BASE}{self.athlete.pk}/measurements/'
        self.today = timezone.localdate()

    def test_one_measurement_per_day(self):
        first = self.client.post(self.url, {'date': str(self.today), 'weight_kg': '80.5',
                                            'height_cm': '180'}, format='json')
        self.assertEqual(first.status_code, 201)
        dupe = self.client.post(self.url, {'date': str(self.today), 'weight_kg': '81'}, format='json')
        self.assertEqual(dupe.status_code, 400)
        self.assertIn('date', dupe.json())
        self.assertEqual(Measurement.objects.filter(athlete=self.athlete, deleted_at__isnull=True).count(), 1)

    def test_edit_and_delete_then_recreate_same_day(self):
        created = self.client.post(self.url, {'date': str(self.today), 'weight_kg': '80'}, format='json')
        m_id = created.json()['id']
        patch = self.client.patch(f'{self.url}{m_id}/', {'weight_kg': '79.4'}, format='json')
        self.assertEqual(patch.status_code, 200)
        self.assertAlmostEqual(patch.json()['weight_kg'], 79.4, places=2)
        self.assertEqual(self.client.delete(f'{self.url}{m_id}/').status_code, 204)
        again = self.client.post(self.url, {'date': str(self.today), 'weight_kg': '78'}, format='json')
        self.assertEqual(again.status_code, 201)

    def test_validation_ranges_and_future_date(self):
        bad_weight = self.client.post(self.url, {'date': str(self.today), 'weight_kg': '10'}, format='json')
        self.assertEqual(bad_weight.status_code, 400)
        future = self.client.post(self.url, {'date': str(self.today + timedelta(days=1)),
                                             'weight_kg': '80'}, format='json')
        self.assertEqual(future.status_code, 400)

    def test_list_is_ascending_with_bmi(self):
        for offset, weight in [(10, '85'), (1, '83')]:
            Measurement.objects.create(athlete=self.athlete, date=self.today - timedelta(days=offset),
                                       weight_kg=Decimal(weight), height_cm=Decimal('180'))
        rows = self.client.get(self.url).json()
        self.assertEqual([row['weight_kg'] for row in rows], [85.0, 83.0])
        self.assertEqual(rows[0]['bmi'], 26.2)

    def test_student_detail_exposes_latest_values_and_delta_source(self):
        Measurement.objects.create(athlete=self.athlete, date=self.today - timedelta(days=20),
                                   weight_kg=Decimal('90'), height_cm=Decimal('180'))
        Measurement.objects.create(athlete=self.athlete, date=self.today, weight_kg=Decimal('85'))
        data = self.client.get(f'{BASE}{self.athlete.pk}/').json()
        self.assertEqual(data['weight_kg'], 85.0)
        self.assertEqual(data['height_cm'], 180.0)
        self.assertEqual(data['first_measurement']['weight_kg'], 90.0)
        self.assertEqual(data['measurements_count'], 2)


class TrashTests(StudentApiBase):
    def setUp(self):
        super().setUp()
        self.athlete = self.make_athlete('سطل', 'زباله')
        self.url = f'{BASE}{self.athlete.pk}/'

    def test_soft_delete_hides_then_restore(self):
        self.assertEqual(self.client.delete(self.url).status_code, 200)
        self.assertEqual(self.names(self.client.get(BASE)), [])
        self.assertEqual([row['last_name'] for row in self.client.get(BASE + 'trash/').json()['results']],
                         ['زباله'])
        restored = self.client.post(f'{self.url}restore/')
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(self.names(self.client.get(BASE)), ['زباله'])

    def test_trash_payload_has_deleted_at(self):
        self.client.delete(self.url)
        row = self.client.get(BASE + 'trash/').json()['results'][0]
        self.assertIsNotNone(row['deleted_at'])
        self.assertIn('has_note', row)

    def test_purge_requires_exact_code(self):
        self.client.delete(self.url)
        wrong = self.client.post(f'{self.url}purge/', {'confirm_code': '000000'}, format='json')
        self.assertEqual(wrong.status_code, 400)
        self.assertTrue(Athlete.objects.filter(pk=self.athlete.pk).exists())
        ok = self.client.post(f'{self.url}purge/', {'confirm_code': self.athlete.unique_code}, format='json')
        self.assertEqual(ok.status_code, 204)
        self.assertFalse(Athlete.objects.filter(pk=self.athlete.pk).exists())
        self.assertTrue(AthleteCodeArchive.objects.filter(code=self.athlete.unique_code).exists())

    def test_code_never_reused_after_purge(self):
        from apps.athletes.models import generate_unique_code

        used = self.athlete.unique_code
        AthleteCodeArchive.objects.create(code=used)
        self.assertNotEqual(generate_unique_code(), used)

    def test_purge_blocked_when_programs_exist(self):
        Program.objects.create(athlete=self.athlete, coach=self.coach, sequence_number=1,
                               title='ب', start_date=timezone.localdate())
        self.client.delete(self.url)
        res = self.client.post(f'{self.url}purge/', {'confirm_code': self.athlete.unique_code}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Athlete.objects.filter(pk=self.athlete.pk).exists())


class StudentWriteTests(StudentApiBase):
    def test_create_and_update_fields(self):
        res = self.client.post(BASE, {
            'first_name': 'نیما', 'last_name': 'کاظمی', 'phone': '09121234567',
            'level': Athlete.LEVEL_ADVANCED, 'goal': 'کاهش وزن',
            'notes': 'زانوی راست حساس است', 'note_tags': ['آسیب زانو', 'آسیب زانو', 'کمر'],
        }, format='json')
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body['note_tags'], ['آسیب زانو', 'کمر'])
        self.assertEqual(body['level_display'], 'پیشرفته')
        self.assertTrue(body['has_note'])
        self.assertEqual(len(body['unique_code']), 6)
        patched = self.client.patch(f'{BASE}{body["id"]}/', {'level': Athlete.LEVEL_PRO}, format='json')
        self.assertEqual(patched.json()['level'], Athlete.LEVEL_PRO)

    def test_invalid_level_and_blank_name_rejected(self):
        res = self.client.post(BASE, {'first_name': '', 'last_name': 'x', 'level': 'superhero'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('first_name', res.json())
        self.assertIn('level', res.json())


class QueryCountTests(StudentApiBase):
    def test_list_query_count_is_constant(self):
        for i in range(8):
            athlete = self.make_athlete(f'ورزشکار{i}', f'شماره{i}')
            Program.objects.create(athlete=athlete, coach=self.coach, sequence_number=1,
                                   title='ب', start_date=timezone.localdate())
            Measurement.objects.create(athlete=athlete, date=timezone.localdate(), weight_kg=Decimal('70'))
        with self.assertNumQueries(2):
            self.client.get(BASE, {'page_size': 50})

    def test_detail_query_count_is_constant(self):
        athlete = self.make_athlete('تک', 'نفره')
        Measurement.objects.create(athlete=athlete, date=timezone.localdate(), weight_kg=Decimal('70'))
        program = Program.objects.create(athlete=athlete, coach=self.coach, sequence_number=1,
                                         title='ب', start_date=timezone.localdate())
        with self.assertNumQueries(2):
            self.client.get(f'{BASE}{athlete.pk}/')

    def test_measurements_list_query_count(self):
        athlete = self.make_athlete('اندازه', 'گیری')
        for day in range(5):
            Measurement.objects.create(athlete=athlete, date=timezone.localdate() - timedelta(days=day),
                                       weight_kg=Decimal('75'))
        with self.assertNumQueries(2):
            self.client.get(f'{BASE}{athlete.pk}/measurements/')
