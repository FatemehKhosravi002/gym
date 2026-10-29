from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
import re

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    username = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'username', 'phone', 'password', 'confirm_password']

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('این نام کاربری قبلاً استفاده شده است')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'تکرار رمز عبور مطابقت ندارد'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            role='coach',
            is_approved=False,
            must_change_password=False,
        )
        return user

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from apps.core.models_settings import AppSettings

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    username = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'username', 'phone', 'password', 'confirm_password']

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('این نام کاربری قبلاً استفاده شده است')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'تکرار رمز عبور مطابقت ندارد'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        settings_obj = AppSettings.load()
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            role='coach',
            is_approved=not settings_obj.registration_requires_approval,
            must_change_password=False,
            is_active=True,
        )
        return user
