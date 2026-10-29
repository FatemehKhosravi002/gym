# Deployment Guide

## Prerequisites
- VPS with Ubuntu/Debian
- Docker and Docker Compose installed
- Domain name (optional) with DNS pointed
- Nginx

## Steps

### 1. Clone and setup
```bash
git clone <repo>
cd gym
cp backend/.env.example backend/.env
# Edit backend/.env with production values
```

### 2. Build and run
```bash
docker-compose up -d --build
```

### 3. Run migrations and seed
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py seed_exercises
docker-compose exec backend python manage.py createsuperuser
```

### 4. Nginx configuration
See nginx/gym.conf example. Configure SSL with Let's Encrypt (certbot).

### 5. Environment variables
Key variables:
- SECRET_KEY: strong random key
- DEBUG: False
- ALLOWED_HOSTS: your domain
- DATABASE_URL: postgres connection
- CORS_ALLOWED_ORIGINS: your frontend domain
- USE_S3: True for production media
