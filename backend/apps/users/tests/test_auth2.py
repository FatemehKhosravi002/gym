from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


class AuthTest2(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_unapproved_cannot_login2(self):
        User.objects.create_user('bob', 'b@b.com', 'ComplexPass123!', role='coach', is_approved=False)
        res = self.client.post('/api/token/', {'username': 'bob', 'password': 'ComplexPass123!'})
        self.assertNotEqual(res.status_code, 200)
