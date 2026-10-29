from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


class AuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_unapproved(self):
        res = self.client.post('/api/users/register/', {
            'first_name': 'علی',
            'last_name': 'رضایی',
            'username': 'ali1',
            'password': 'ComplexPass123!',
            'confirm_password': 'ComplexPass123!',
        })
        self.assertEqual(res.status_code, 201)
        u = User.objects.get(username='ali1')
        self.assertFalse(u.is_approved)

    def test_unapproved_cannot_login(self):
        User.objects.create_user('bob', 'b@b.com', 'ComplexPass123!', role='coach', is_approved=False)
        res = self.client.post('/api/token/', {'username': 'bob', 'password': 'ComplexPass123!'})
        self.assertNotEqual(res.status_code, 200)
