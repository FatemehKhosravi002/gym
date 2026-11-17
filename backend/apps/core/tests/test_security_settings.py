from django.conf import settings
from django.test import SimpleTestCase


class SecuritySettingsTest(SimpleTestCase):
    """Cookie flags and CSRF origins must have working defaults (admin 403 fix)."""

    def test_admin_login_page_renders(self):
        from django.test import Client
        res = Client().get('/admin/login/')
        self.assertEqual(res.status_code, 200)

    def test_csrf_origins_is_a_list(self):
        self.assertIsInstance(settings.CSRF_TRUSTED_ORIGINS, list)

    def test_env_bool_parser(self):
        from gym_backend.settings import _env_bool
        import os
        os.environ['_PHYSIQUE_TEST_FLAG'] = 'yes'
        os.environ['_PHYSIQUE_TEST_FLAG_EMPTY'] = ''
        try:
            self.assertTrue(_env_bool('_PHYSIQUE_TEST_FLAG', False))
            self.assertFalse(_env_bool('_PHYSIQUE_TEST_FLAG_MISSING', False))
            self.assertTrue(_env_bool('_PHYSIQUE_TEST_FLAG_EMPTY', True))
        finally:
            os.environ.pop('_PHYSIQUE_TEST_FLAG', None)
            os.environ.pop('_PHYSIQUE_TEST_FLAG_EMPTY', None)

    def test_csv_parser_uses_default_for_empty_env(self):
        from gym_backend.settings import _csv
        import os
        os.environ['_PHYSIQUE_TEST_LIST'] = ''
        try:
            self.assertEqual(_csv('_PHYSIQUE_TEST_LIST', 'https://a.test, https://b.test'),
                             ['https://a.test', 'https://b.test'])
        finally:
            os.environ.pop('_PHYSIQUE_TEST_LIST', None)

