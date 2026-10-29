from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.core.models_settings import AppSettings

User = get_user_model()


class AdminPanelTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser('adminx', 'a@a.com', 'pass123456!')
        self.admin.role = 'admin'
        self.admin.is_approved = True
        self.admin.save()
        self.coach = User.objects.create_user('c1', 'c@c.com', 'pass123456!', role='coach', is_approved=True, is_active=True)

    def test_coach_cannot_access_admin(self):
        self.client.force_authenticate(user=self.coach)
        res = self.client.get('/api/admin/overview/')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_overview(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/admin/overview/')
        self.assertEqual(res.status_code, 200)

    def test_registration_no_approval(self):
        s = AppSettings.load()
        s.registration_requires_approval = False
        s.save()
        c = APIClient()
        res = c.post('/api/users/register/', {'first_name': 'ع', 'last_name': 'ب', 'username': 'newc', 'password': 'ComplexPass123!', 'confirm_password': 'ComplexPass123!'})
        self.assertIn(res.status_code, [200, 201])
        self.assertIn('access', res.data)

    def test_deactivate_blocks(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(f'/api/admin/coaches/{self.coach.id}/action/', {'action': 'deactivate'})
        c = APIClient()
        r = c.post('/api/token/', {'username': 'c1', 'password': 'pass123456!'})
        self.assertNotEqual(r.status_code, 200)
