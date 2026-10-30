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


from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone


class CategoryViewSet(CategoryViewSet):
    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        cat = self.get_object()
        order = request.data.get('order')
        if order is not None:
            cat.order = order
            cat.save()
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def move_exercises(self, request, pk=None):
        cat = self.get_object()
        target_id = request.data.get('target_category_id')
        try:
            target = Category.objects.get(pk=target_id)
        except Category.DoesNotExist:
            return Response({'detail': 'دسته‌بندی مقصد یافت نشد'}, status=404)
        Exercise.objects.filter(category=cat).update(category=target)
        # check if can delete
        if Exercise.objects.filter(category=cat).count() == 0:
            cat.delete()
            return Response({'status': 'moved_and_deleted'})
        return Response({'status': 'moved'})


class ExerciseViewSet(ExerciseViewSet):
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        ex = self.get_object()
        ex.is_active = False
        ex.save()
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        ex = self.get_object()
        ex.is_active = True
        ex.save()
        return Response({'status': 'restored'})

    def get_queryset(self):
        qs = Exercise.objects.select_related('category').all()
        show_archived = self.request.query_params.get('show_archived') == 'true'
        if not show_archived:
            qs = qs.filter(is_active=True)
        return qs


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

    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        cat = self.get_object()
        order = request.data.get('order')
        if order is not None:
            cat.order = order
            cat.save()
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def move_exercises(self, request, pk=None):
        cat = self.get_object()
        target_id = request.data.get('target_category_id')
        try:
            target = Category.objects.get(pk=target_id)
        except Category.DoesNotExist:
            return Response({'detail': 'دسته‌بندی مقصد یافت نشد'}, status=404)
        Exercise.objects.filter(category=cat).update(category=target)
        if Exercise.objects.filter(category=cat).count() == 0:
            cat.delete()
            return Response({'status': 'moved_and_deleted'})
        return Response({'status': 'moved'})


class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.select_related('category').all()
    serializer_class = ExerciseSerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering = ['name']
    filterset_fields = ['category', 'is_active']

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        ex = self.get_object()
        ex.is_active = False
        ex.save()
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        ex = self.get_object()
        ex.is_active = True
        ex.save()
        return Response({'status': 'restored'})

    def get_queryset(self):
        qs = Exercise.objects.select_related('category').all()
        show_archived = self.request.query_params.get('show_archived') == 'true'
        if not show_archived:
            qs = qs.filter(is_active=True)
        return qs


from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Category, Exercise
from .serializers import CategorySerializer, ExerciseSerializer
from apps.athletes.permissions import IsCoachOrAdmin
from django.db.models import ProtectedError


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering = ['order', 'name']

    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        cat = self.get_object()
        order = request.data.get('order')
        if order is not None:
            cat.order = order
            cat.save()
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def move_exercises(self, request, pk=None):
        cat = self.get_object()
        target_id = request.data.get('target_category_id')
        try:
            target = Category.objects.get(pk=target_id)
        except Category.DoesNotExist:
            return Response({'detail': 'دسته‌بندی مقصد یافت نشد'}, status=404)
        Exercise.objects.filter(category=cat).update(category=target)
        if Exercise.objects.filter(category=cat).count() == 0:
            cat.delete()
            return Response({'status': 'moved_and_deleted'})
        return Response({'status': 'moved'})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if Exercise.objects.filter(category=instance).exists():
            return Response({'detail': 'این دسته دارای حرکت است. ابتدا حرکات را به دسته دیگری منتقل کنید.', 'needs_move': True}, status=400)
        self.perform_destroy(instance)
        return Response(status=204)


from .utils import normalize_persian


class ExerciseViewSet(ExerciseViewSet):
    @action(detail=False, methods=['get'])
    def check_duplicate(self, request):
        name = request.query_params.get('name', '')
        norm = normalize_persian(name)
        for ex in Exercise.objects.all():
            if normalize_persian(ex.name) == norm and norm:
                return Response({'exists': True, 'id': ex.id, 'name': ex.name})
        return Response({'exists': False})
