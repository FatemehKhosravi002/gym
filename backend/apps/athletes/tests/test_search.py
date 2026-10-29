from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.athletes.models import Athlete
from rest_framework.test import APIClient


class SearchTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user('coach', 'c@test.com', 'pass')
        self.a = Athlete.objects.create(first_name='محمد', last_name='احمدی', coach=self.user)

    def test_search_combined(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.get('/api/athletes/search_combined/?q=محمد')
        self.assertEqual(res.status_code, 200)
