import io
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase

from apps.library.models import Category, Exercise

SEED_FILE = Path(settings.BASE_DIR) / 'data' / 'exercises_seed.json'


class SeedPathResolutionTest(SimpleTestCase):
    def test_seed_file_ships_with_backend(self):
        self.assertTrue(SEED_FILE.is_file(), f'missing seed data at {SEED_FILE}')

    def test_candidate_paths_include_backend_data(self):
        from apps.core.management.commands.seed_exercises import _candidate_paths
        self.assertIn(SEED_FILE, _candidate_paths())


class SeedCommandTest(TestCase):
    def test_seed_loads_categories_and_exercises(self):
        out = io.StringIO()
        call_command('seed_exercises', stdout=out)
        self.assertGreater(Category.objects.count(), 0)
        self.assertGreater(Exercise.objects.count(), 0)
        # Second run must be idempotent.
        count = Exercise.objects.count()
        call_command('seed_exercises', stdout=io.StringIO())
        self.assertEqual(Exercise.objects.count(), count)

    def test_missing_seed_file_raises_command_error(self):
        with self.assertRaises(CommandError):
            call_command('seed_exercises', path='/tmp/definitely-not-here.json', stdout=io.StringIO())
