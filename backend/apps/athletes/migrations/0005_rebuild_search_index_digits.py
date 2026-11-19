import unicodedata

from django.db import migrations

DIGIT_TRANSLATION = str.maketrans(
    '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',
    '01234567890123456789',
)


def _norm(text):
    """Copy of athletes.models.normalize_persian at the time of this migration."""
    if not text:
        return ''
    text = unicodedata.normalize('NFKC', str(text)).lower()
    text = text.replace('ي', 'ی').replace('ك', 'ک').replace('ى', 'ی')
    text = text.translate(DIGIT_TRANSLATION)
    text = text.replace('\u200c', ' ').replace('\u200d', ' ').replace('\u0640', '')
    kept = []
    for ch in text:
        if ch.isspace():
            kept.append(' ')
        elif unicodedata.category(ch).startswith(('L', 'N')):
            kept.append(ch)
    return ' '.join(''.join(kept).split())


def rebuild_search_index(apps, schema_editor):
    Athlete = apps.get_model('athletes', 'Athlete')
    for athlete in Athlete.objects.iterator():
        parts = [athlete.first_name, athlete.last_name, athlete.unique_code, athlete.phone]
        parts.extend(athlete.note_tags or [])
        normalized = _norm(' '.join(str(p or '') for p in parts))
        athlete.search_index = f'{normalized} {normalized.replace(" ", "")}'.strip()
        athlete.save(update_fields=['search_index'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('athletes', '0004_athlete_profile_fields_trash'),
    ]

    operations = [
        migrations.RunPython(rebuild_search_index, noop),
    ]
