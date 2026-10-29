from .settings import *
import os

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'dev.sqlite3',
    }
}
DEBUG = True
CORS_ALLOW_ALL_ORIGINS = True

SIMPLE_JWT['TOKEN_OBTAIN_SERIALIZER'] = 'gym_backend.custom_auth.CustomTokenObtainPairSerializer'

AUTHENTICATION_BACKENDS = ['gym_backend.auth_backends.ActiveUserBackend']
