import json
import os
from django.core.management.base import BaseCommand
from apps.library.models import Category, Exercise


class Command(BaseCommand):
    help = 'Seed exercises from exercises_seed.json'

    def handle(self, *args, **options):
        seed_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), 'exercises_seed.json')
        if not os.path.exists(seed_path):
            # try alternative path
            seed_path = '/home/bahar/gym/exercises_seed.json'
        with open(seed_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for bp in data.get('body_parts', []):
            cat, _ = Category.objects.get_or_create(name=bp['name'], defaults={'order': bp.get('order', 0), 'is_active': True})

        for ex in data.get('exercises', []):
            cat = Category.objects.filter(name=ex['body_part']).first()
            if not cat:
                continue
            Exercise.objects.get_or_create(
                name=ex['name'],
                category=cat,
                defaults={'is_active': True}
            )

        self.stdout.write(self.style.SUCCESS('Seeded exercises successfully'))
