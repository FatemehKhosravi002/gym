"""Manual end-to-end check for the repeat-history feature.

usage
Run from the backend folder (uses the same settings as `manage.py`):

    cd backend
    python3 scripts/manual_repeat_history.py            # configured database
    python3 scripts/manual_repeat_history.py --sqlite   # throwaway in-memory DB

The script talks to the real DRF views through `APIClient` (no server needed):

1. creates a coach + a student,
2. creates 3 finished programmes that all contain the same exercise,
3. starts a 4th programme, adds the exercise to it,
4. asks `/api/athletes/{id}/exercise_history/?exercise_id=X&exclude_program=<program 4>`
   and verifies `count == 3` with the expected newest-first list,
5. prints the monthly grouping (calendar marks) the frontend draws.

Exit code 0 means the backend contract the builder relies on is intact.
"""
import datetime
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
USE_SQLITE = '--sqlite' in sys.argv[1:]
os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'gym_backend.settings_test' if USE_SQLITE else 'gym_backend.settings',
)

import django  # noqa: E402

django.setup()

if USE_SQLITE:
    from django.core.management import call_command

    call_command('migrate', verbosity=0, run_syncdb=True, interactive=False)

import jdatetime  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

from apps.athletes.models import Athlete  # noqa: E402
from apps.library.models import Category, Exercise  # noqa: E402

JALALI_MONTHS = [
    '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]


def gregorian(jy, jm, jd):
    return jdatetime.date(jy, jm, jd).togregorian()


def month_label(iso_date):
    jd = jdatetime.date.fromgregorian(date=datetime.date.fromisoformat(iso_date))
    return f'{JALALI_MONTHS[jd.month]} {jd.year}'


def main():
    stamp = int(time.time())
    User = get_user_model()
    coach = User.objects.create_user(
        f'history-coach-{stamp}', f'history-{stamp}@example.com', 'pass123456!',
        role='coach', is_approved=True,
    )
    athlete = Athlete.objects.create(first_name='تست', last_name=f'سابقه {stamp}', coach=coach)
    category, _ = Category.objects.get_or_create(name='سینه (تست سابقه)', defaults={'order': 99})
    exercise, _ = Exercise.objects.get_or_create(
        name=f'پرس سینه تست {stamp}', defaults={'category': category},
    )

    client = APIClient()
    client.force_authenticate(user=coach)
    print(f'coach={coach.username} student={athlete.id} exercise={exercise.id}')

    # 1) Three finished programmes containing the exercise (مهر / آبان ۱۴۰۵).
    planned = [
        (gregorian(1405, 7, 10), 'برنامه مهر'),
        (gregorian(1405, 8, 5), 'برنامه آبان ۱'),
        (gregorian(1405, 8, 20), 'برنامه آبان ۲'),
    ]
    for index, (start, title) in enumerate(planned, start=1):
        program_res = client.post('/api/programs/', {
            'athlete': athlete.id, 'title': title, 'start_date': start.isoformat(),
            'days_per_week': 2, 'status': 'final',
        })
        assert program_res.status_code == 201, program_res.data
        program_id = program_res.data['id']
        day_res = client.post('/api/program-days/', {'program': program_id, 'day_index': 1, 'label': 'سینه'})
        assert day_res.status_code == 201, day_res.data
        item_res = client.post('/api/program-items/', {
            'program_day': day_res.data['id'], 'exercise': exercise.id, 'order': 0,
            'sets': str(index + 2), 'reps': '10',
        })
        assert item_res.status_code == 201, item_res.data
        print(f'  program {index}: id={program_id} start={start} ({month_label(start.isoformat())})')

    # 2) Start programme 4 (draft) and add the same exercise to it.
    program4_res = client.post('/api/programs/', {
        'athlete': athlete.id, 'title': 'برنامه چهارم', 'start_date': gregorian(1405, 9, 1).isoformat(),
        'days_per_week': 3, 'status': 'draft',
    })
    assert program4_res.status_code == 201, program4_res.data
    program4 = program4_res.data['id']
    day4_res = client.post('/api/program-days/', {'program': program4, 'day_index': 1})
    assert day4_res.status_code == 201, day4_res.data
    item4_res = client.post('/api/program-items/', {
        'program_day': day4_res.data['id'], 'exercise': exercise.id, 'order': 0, 'sets': '3', 'reps': '12',
    })
    assert item4_res.status_code == 201, item4_res.data
    print(f'  program 4 (draft): id={program4} (the exercise was just added to day 1)')

    # 3) The exact call the builder makes after picking an exercise.
    history_res = client.get(
        f'/api/athletes/{athlete.id}/exercise_history/?exercise_id={exercise.id}&exclude_program={program4}'
    )
    assert history_res.status_code == 200, history_res.data
    history = history_res.data
    assert history['count'] == 3, history
    assert [row['sequence_number'] for row in history['programs']] == [3, 2, 1], history['programs']
    assert history['last']['sequence_number'] == 3, history['last']
    assert all(row['day_index'] == 1 for row in history['programs']), history['programs']

    print('\nLIST view (newest first) — what the dialog shows:')
    print('  count:', history['count'])
    for row in history['programs']:
        print(
            f"  برنامهٔ {row['sequence_number']} ({month_label(row['date'])}) — "
            f"روز {row['day_index']} — {row['sets']}×{row['reps']} — {row['date_jalali']}"
        )

    # 4) Calendar marks (the frontend groups the same rows by Jalali month/day).
    marks = {}
    for row in history['programs']:
        jd = jdatetime.date.fromgregorian(date=datetime.date.fromisoformat(row['date']))
        marks.setdefault(f'{JALALI_MONTHS[jd.month]} {jd.year}', []).append(jd.day)
    print('\nCALENDAR view (month -> marked days):')
    for label, days in marks.items():
        print(f'  {label}: {days}')
    assert len(marks) == 2, marks
    assert marks['آبان 1405'] == [20, 5], marks

    # 5) Badge counts: the programme page includes programme 4, the builder excludes it.
    counts_res = client.get(f'/api/athletes/{athlete.id}/repeat_counts/?exercise_ids={exercise.id}')
    assert counts_res.status_code == 200, counts_res.data
    assert counts_res.data['counts'][str(exercise.id)] == 4, counts_res.data
    print(f'\nbadge «تکرار ×۴» => {counts_res.data["counts"]}')

    excluded_res = client.get(
        f'/api/athletes/{athlete.id}/repeat_counts/?exercise_ids={exercise.id}&exclude_program={program4}'
    )
    assert excluded_res.data['counts'][str(exercise.id)] == 3, excluded_res.data
    print('badge in the builder (excluding the open draft) => «تکرار ×۳»')

    print('\nPASS — delete the test student from the admin panel if you like.')


if __name__ == '__main__':
    main()
