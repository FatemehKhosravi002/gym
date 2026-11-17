import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.library.models import Category, Exercise


def _candidate_paths():
    """Where the seed file may live, in priority order.

    Covers: explicit env override, the backend image (backend/data/), the
    Django BASE_DIR and the repository root (one level above backend/).
    """
    import os

    candidates = []
    env_path = os.environ.get('SEED_EXERCISES_PATH')
    if env_path:
        candidates.append(Path(env_path))
    base = Path(settings.BASE_DIR)
    candidates.append(base / 'data' / 'exercises_seed.json')
    candidates.append(base / 'exercises_seed.json')
    candidates.append(base.parent / 'exercises_seed.json')
    return candidates


class Command(BaseCommand):
    help = 'Seed exercise library from exercises_seed.json'

    def add_arguments(self, parser):
        parser.add_argument('--path', help='Explicit path to exercises_seed.json')

    def handle(self, *args, **options):
        if options.get('path'):
            seed_path = Path(options['path'])
        else:
            seed_path = next((p for p in _candidate_paths() if p.is_file()), None)
        if not seed_path or not seed_path.is_file():
            searched = ', '.join(str(p) for p in _candidate_paths())
            raise CommandError(f'exercises_seed.json not found. Looked in: {searched}')

        with open(seed_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        categories = {}
        for bp in data.get('body_parts', []):
            cat, _ = Category.objects.get_or_create(
                name=bp['name'], defaults={'order': bp.get('order', 0), 'is_active': True}
            )
            categories[bp['name']] = cat

        created = 0
        skipped = 0
        for ex in data.get('exercises', []):
            cat = categories.get(ex['body_part'])
            if not cat:
                skipped += 1
                continue
            _, was_created = Exercise.objects.get_or_create(
                name=ex['name'], category=cat, defaults={'is_active': True}
            )
            created += 1 if was_created else 0

        self.stdout.write(self.style.SUCCESS(
            f'Seeded exercise library from {seed_path} '
            f'(categories: {len(categories)}, new exercises: {created}, skipped: {skipped})'
        ))

