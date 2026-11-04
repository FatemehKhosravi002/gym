from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Category, Exercise
from .serializers import CategorySerializer, ExerciseSerializer
from apps.athletes.permissions import IsCoachOrAdmin
from .utils import normalize_persian
from apps.programs.models import ProgramItem


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering = ['order', 'name']

    def perform_create(self, serializer):
        name = serializer.validated_data.get('name', '').strip()
        serializer.save(name=name)

    def perform_update(self, serializer):
        if 'name' in serializer.validated_data:
            serializer.validated_data['name'] = serializer.validated_data['name'].strip()
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        count = Exercise.objects.filter(category=instance).count()
        if count > 0:
            return Response({'detail': 'ابتدا حرکات این دسته را به دسته دیگری منتقل کنید.', 'exercise_count': count}, status=409)
        self.perform_destroy(instance)
        return Response(status=204)

    @action(detail=True, methods=['post'], url_path='delete_and_move')
    def delete_and_move(self, request, pk=None):
        cat = self.get_object()
        move_to_id = request.data.get('move_to')
        try:
            target = Category.objects.get(pk=move_to_id)
        except Category.DoesNotExist:
            return Response({'detail': 'دسته‌بندی مقصد یافت نشد'}, status=400)
        if target == cat:
            return Response({'detail': 'دسته‌بندی مقصد نمی‌تواند همان دسته باشد'}, status=400)
        Exercise.objects.filter(category=cat).update(category=target)
        cat.delete()
        return Response({'detail': 'حرکات منتقل و دسته‌بندی حذف شد'})

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

    def get_queryset(self):
        qs = Exercise.objects.select_related('category').all()
        include_inactive = self.request.query_params.get('include_inactive') == '1' or self.request.query_params.get('show_archived') == 'true'
        if not include_inactive:
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        name = serializer.validated_data.get('name', '').strip()
        serializer.save(name=name)

    def perform_update(self, serializer):
        if 'name' in serializer.validated_data:
            serializer.validated_data['name'] = serializer.validated_data['name'].strip()
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if ProgramItem.objects.filter(exercise=instance).exists():
            instance.is_active = False
            instance.save()
            return Response({'detail': 'این حرکت در برنامه‌ها استفاده شده و غیرفعال شد.'}, status=200)
        self.perform_destroy(instance)
        return Response(status=204)

    @action(detail=False, methods=['get'])
    def check_duplicate(self, request):
        name = request.query_params.get('name', '')
        norm = normalize_persian(name)
        for ex in Exercise.objects.all():
            if normalize_persian(ex.name) == norm and norm:
                return Response({'exists': True, 'id': ex.id, 'name': ex.name})
        return Response({'exists': False})

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


from rest_framework.decorators import action
from rest_framework.response import Response


class ExerciseViewSet(ExerciseViewSet):
    @action(detail=False, methods=['get'])
    def check_duplicate(self, request):
        name = request.query_params.get('name', '')
        norm = normalize_persian(name)
        for ex in Exercise.objects.all():
            if normalize_persian(ex.name) == norm and norm:
                return Response({'exists': True, 'id': ex.id, 'name': ex.name})
        return Response({'exists': False})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        ex = self.get_object()
        ex.is_active = False
        ex.save()
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        try:
            ex = Exercise.objects.get(pk=pk)
        except Exercise.DoesNotExist:
            return Response({'detail': 'یافت نشد'}, status=404)
        ex.is_active = True
        ex.save()
        return Response({'status': 'restored'})


class CategoryViewSet(CategoryViewSet):
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        cat = self.get_object()
        cat.is_active = False
        cat.save()
        return Response({'status': 'deactivated'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        cat = self.get_object()
        cat.is_active = True
        cat.save()
        return Response({'status': 'activated'})
