"""Repeat-history queries: how often did an exercise appear in a student's programs?

Everything here is built on a single `ProgramItem` query (no per-program loop),
so the endpoint stays fast even for a student with hundreds of programs.
"""
from django.db.models import Count, Max

from apps.core.utils_jalali import gregorian_to_jalali_month_label, gregorian_to_jalali_str
from apps.programs.models import ProgramItem

HISTORY_ITEM_FIELDS = (
    'program_day__program_id',
    'program_day__program__sequence_number',
    'program_day__program__start_date',
    'program_day__day_index',
    'sets',
    'reps',
)


def _live_items(athlete, exclude_program=None):
    """Program items of the athlete's programmes, ignoring archived (soft-deleted) ones."""
    qs = ProgramItem.objects.filter(
        program_day__program__athlete=athlete,
        program_day__program__is_archived=False,
    )
    if exclude_program:
        qs = qs.exclude(program_day__program_id=exclude_program)
    return qs


def _row(values):
    start_date = values['program_day__program__start_date']
    return {
        'id': values['program_day__program_id'],
        'sequence_number': values['program_day__program__sequence_number'],
        'date': start_date.isoformat() if start_date else '',
        'date_jalali': gregorian_to_jalali_str(start_date),
        'day_index': values['program_day__day_index'],
        'sets': values['sets'],
        'reps': values['reps'],
    }


def exercise_history(athlete, exercise_id, exclude_program=None):
    """Return one row per programme (newest first) that contains the exercise.

    Draft and final programmes both count; archived (soft-deleted) ones do not.
    When a programme holds the exercise on several days the first day is kept.
    """
    values = (
        _live_items(athlete, exclude_program)
        .filter(exercise_id=exercise_id)
        .values(*HISTORY_ITEM_FIELDS)
        .order_by(
            '-program_day__program__sequence_number',
            '-program_day__program__created_at',
            'program_day__day_index',
            'order',
            'id',
        )
    )
    programs = []
    seen = set()
    for row in values:
        program_id = row['program_day__program_id']
        if program_id in seen:
            continue
        seen.add(program_id)
        programs.append(_row(row))
    return {
        'count': len(programs),
        'last': programs[0] if programs else None,
        'programs': programs,
    }


def frequent_exercises(athlete, limit=10):
    """Top exercises for a student, ranked by the number of programmes that include them."""
    rows = (
        _live_items(athlete)
        .values('exercise_id', 'exercise__name', 'exercise_name_snapshot')
        .annotate(
            count=Count('program_day__program_id', distinct=True),
            last_sequence_number=Max('program_day__program__sequence_number'),
            last_date=Max('program_day__program__start_date'),
        )
        .order_by('-count', 'exercise__name')[:limit]
    )
    return [
        {
            'exercise_id': row['exercise_id'],
            'name': row['exercise__name'] or row['exercise_name_snapshot'],
            'count': row['count'],
            'last_sequence_number': row['last_sequence_number'],
            'last_date': row['last_date'].isoformat() if row['last_date'] else '',
            'last_date_jalali': gregorian_to_jalali_month_label(row['last_date']),
        }
        for row in rows
    ]


def repeat_counts(athlete, exercise_ids=None, exclude_program=None):
    """{exercise_id: programme count} for a whole programme page, in one query."""
    qs = _live_items(athlete, exclude_program)
    if exercise_ids:
        qs = qs.filter(exercise_id__in=list(exercise_ids))
    rows = (
        qs.values('exercise_id')
        .annotate(count=Count('program_day__program_id', distinct=True))
        .order_by()
    )
    return {row['exercise_id']: row['count'] for row in rows}

