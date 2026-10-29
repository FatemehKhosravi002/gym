from .settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

SIMPLE_JWT['TOKEN_OBTAIN_SERIALIZER'] = 'gym_backend.custom_auth.CustomTokenObtainPairSerializer'

AUTHENTICATION_BACKENDS = ['gym_backend.auth_backends.ActiveUserBackend']
