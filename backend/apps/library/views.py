from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Category, Exercise
from .serializers import CategorySerializer, ExerciseSerializer
from apps.athletes.permissions import IsCoachOrAdmin


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering = ['order', 'name']


class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.select_related('category').all()
    serializer_class = ExerciseSerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering = ['name']
    filterset_fields = ['category', 'is_active']
