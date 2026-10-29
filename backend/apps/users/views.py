from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'gym_name': user.gym_name,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'gym_name': user.gym_name,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_approved': getattr(user, 'is_approved', True),
            'must_change_password': getattr(user, 'must_change_password', False),
            'is_superuser': user.is_superuser,
        })
