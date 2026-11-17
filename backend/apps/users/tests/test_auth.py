from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.core.models_settings import AppSettings

User = get_user_model()

STRONG = 'ComplexPass123!'


class AuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _register(self, username='ali1'):
        return self.client.post('/api/users/register/', {
            'first_name': 'علی',
            'last_name': 'رضایی',
            'username': username,
            'password': STRONG,
            'confirm_password': STRONG,
        })

    def test_register_active_without_approval(self):
        res = self._register()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertFalse(res.data.get('requires_approval'))
        self.assertIn('access', res.data)
        u = User.objects.get(username='ali1')
        self.assertTrue(u.is_approved)
        self.assertTrue(u.is_active)

    def test_register_can_login_immediately(self):
        self._register()
        res = self.client.post('/api/users/token/', {'username': 'ali1', 'password': STRONG})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn('access', res.data)

    def test_register_unapproved_when_approval_required(self):
        AppSettings.objects.update_or_create(pk=1, defaults={'registration_requires_approval': True})
        res = self._register('ali2')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data.get('requires_approval'))
        self.assertNotIn('access', res.data)
        u = User.objects.get(username='ali2')
        self.assertFalse(u.is_approved)

    def test_unapproved_cannot_login(self):
        User.objects.create_user('bob', 'b@b.com', STRONG, role='coach', is_approved=False)
        res = self.client.post('/api/users/token/', {'username': 'bob', 'password': STRONG})
        self.assertEqual(res.status_code, 401)

