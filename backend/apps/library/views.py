from django.db.models.functions import Lower, Replace
from django.db.models import Value
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Category, Exercise
from .serializers import CategorySerializer, ExerciseSerializer
from apps.athletes.permissions import IsCoachOrAdmin
from apps.programs.models import ProgramItem
from .utils import normalize_persian, similar_names


def usage_programs(exercise):
    """Number of distinct (non-archived) programmes that contain the exercise."""
    return (
        ProgramItem.objects.filter(exercise=exercise, program_day__program__is_archived=False)
        .values('program_day__program_id')
        .distinct()
        .count()
    )


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsCoachOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering = ['order', 'name']

    def get_queryset(self):
        qs = Category.objects.all()
        include_inactive = (
            self.request.query_params.get('include_inactive') in ('1', 'true', 'yes')
            or self.request.query_params.get('show_disabled') in ('1', 'true', 'yes')
        )
        if not include_inactive and self.action == 'list':
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
            cat.order = int(order)
            cat.save(update_fields=['order'])
        return Response(CategorySerializer(cat).data)

    @action(detail=False, methods=['post'], url_path='reorder-all')
    def reorder_all(self, request):
        """Persist a drag-and-drop order: {"order": [id, id, …]}."""
        ids = request.data.get('order') or []
        if not isinstance(ids, list) or not all(isinstance(value, int) for value in ids):
            return Response({'detail': 'فرمت ترتیب دسته‌بندی‌ها نامعتبر است'}, status=400)
        for position, cat_id in enumerate(ids):
            Category.objects.filter(pk=cat_id).update(order=position)
        return Response({'status': 'ok', 'order': ids})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        cat = self.get_object()
        cat.is_active = False
        cat.save(update_fields=['is_active'])
        return Response({'status': 'deactivated', 'is_active': False})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        cat = self.get_object()
        cat.is_active = True
        cat.save(update_fields=['is_active'])
        return Response({'status': 'activated', 'is_active': True})

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
    filter_backends = [filters.OrderingFilter]
    ordering = ['name']
    filterset_fields = ['category', 'is_active']

    def get_queryset(self):
        qs = Exercise.objects.select_related('category').all()
        include_inactive = (
            self.request.query_params.get('include_inactive') in ('1', 'true', 'yes')
            or self.request.query_params.get('show_archived') in ('1', 'true', 'yes')
            or self.request.query_params.get('show_disabled') in ('1', 'true', 'yes')
        )
        if not include_inactive and self.action == 'list':
            qs = qs.filter(is_active=True)
        category = (self.request.query_params.get('category') or '').strip()
        if category.isdigit():
            qs = qs.filter(category_id=int(category))
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            # «پرس سينه» finds «پرس سینه»: normalize both sides, then token AND.
            normalized_name = Replace(
                Replace(
                    Replace(
                        Replace(Lower('name'), Value('ي'), Value('ی')),
                        Value('ك'), Value('ک'),
                    ),
                    Value('\u200c'), Value(''),
                ),
                Value(' '), Value(''),
            )
            qs = qs.annotate(_search_name=normalized_name)
            for token in normalize_persian(search).split():
                qs = qs.filter(_search_name__contains=token)
        return qs

    def perform_create(self, serializer):
        serializer.save(name=serializer.validated_data.get('name', '').strip())

    def perform_update(self, serializer):
        if 'name' in serializer.validated_data:
            serializer.validated_data['name'] = serializer.validated_data['name'].strip()
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Hard delete is only allowed for unused exercises; otherwise 409 + usage count."""
        from django.db.models import ProtectedError

        instance = self.get_object()
        count = usage_programs(instance)
        if count > 0:
            return Response({
                'detail': (
                    f'این حرکت در {count} برنامه استفاده شده است و قابل حذف کامل نیست. '
                    'می‌توانید آن را غیرفعال کنید تا در برنامه‌های قبلی بماند ولی در ساخت برنامه جدید نیاید.'
                ),
                'usage_count': count,
                'can_disable': True,
            }, status=409)
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response({
                'detail': 'این حرکت در یک قالب برنامه استفاده شده و قابل حذف کامل نیست؛ آن را غیرفعال کنید.',
                'usage_count': 0,
                'used_in_templates': True,
                'can_disable': True,
            }, status=409)
        return Response(status=204)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move the exercise to another category."""
        exercise = self.get_object()
        category_id = request.data.get('category')
        try:
            category = Category.objects.get(pk=category_id)
        except (Category.DoesNotExist, TypeError, ValueError):
            return Response({'detail': 'دسته‌بندی مقصد یافت نشد'}, status=400)
        exercise.category = category
        exercise.save(update_fields=['category'])
        return Response(ExerciseSerializer(exercise, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        exercise = self.get_object()
        exercise.is_active = False
        exercise.save(update_fields=['is_active'])
        return Response({'status': 'deactivated', 'is_active': False, 'usage_count': usage_programs(exercise)})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        exercise = self.get_object()
        exercise.is_active = True
        exercise.save(update_fields=['is_active'])
        return Response({'status': 'activated', 'is_active': True})

    # Backwards-compatible aliases used by older screens.
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        return self.deactivate(request, pk=pk)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        return self.activate(request, pk=pk)

    @action(detail=False, methods=['get'], url_path='check-duplicate')
    def check_duplicate(self, request):
        """Exact duplicate + similar-name warnings (Persian normalized, difflib)."""
        name = (request.query_params.get('name') or '').strip()
        if not name:
            return Response({'exists': False, 'similar': []})
        exact = next(
            (ex for ex in Exercise.objects.all() if normalize_persian(ex.name) == normalize_persian(name)),
            None,
        )
        return Response({
            'exists': exact is not None,
            'id': exact.id if exact else None,
            'name': exact.name if exact else None,
            'similar': similar_names(name, Exercise.objects.values_list('name', flat=True)),
        })
