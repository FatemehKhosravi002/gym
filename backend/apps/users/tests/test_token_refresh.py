from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()
STRONG = 'ComplexPass123!'


class TokenRefreshTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            'coach1', 'c@example.com', STRONG, role='coach', is_approved=True, is_active=True,
        )

    def _tokens(self):
        res = self.client.post('/api/users/token/', {'username': 'coach1', 'password': STRONG})
        self.assertEqual(res.status_code, 200, res.data)
        return res.data

    def test_refresh_returns_new_access_token(self):
        tokens = self._tokens()
        res = self.client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn('access', res.data)

    def test_refresh_rejects_deactivated_user(self):
        tokens = self._tokens()
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        res = self.client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(res.status_code, 401)

    def test_refresh_rejects_unapproved_coach(self):
        tokens = self._tokens()
        self.user.is_approved = False
        self.user.save(update_fields=['is_approved'])
        res = self.client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(res.status_code, 401)

    def test_refresh_rejects_garbage_token(self):
        res = self.client.post('/api/users/token/refresh/', {'refresh': 'not-a-token'})
        self.assertEqual(res.status_code, 401)
