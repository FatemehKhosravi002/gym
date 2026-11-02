from django.core.management.base import BaseCommand
from django.urls import resolve
from django.urls.exceptions import Resolver404


class Command(BaseCommand):
    help = 'Smoke test routes'

    def handle(self, *args, **options):
        urls = [
            '/api/users/token/',
            '/api/users/token/refresh/',
            '/api/users/me/',
            '/api/users/register/',
            '/api/athletes/',
            '/api/library/categories/',
            '/api/library/exercises/',
            '/api/programs/',
            '/api/program-days/',
            '/api/program-items/',
            '/api/admin/overview/',
            '/api/programs/public/test/',
        ]
        failed = []
        for u in urls:
            try:
                resolve(u)
            except Resolver404:
                failed.append(u)
        if failed:
            self.stdout.write(self.style.ERROR('Failed: ' + ','.join(failed)))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS('All routes resolved'))
