# Gym Program Builder

Complete, production-ready web application for gym coaches in Iran to build bodybuilding programs.

## Tech Stack
- Backend: Django + DRF, PostgreSQL, JWT (SimpleJWT)
- Frontend: React + Vite + TypeScript + Tailwind CSS, PWA
- Persian (fa-IR), RTL, Vazirmatn, Jalali dates
- PDF: WeasyPrint
- Docker + docker-compose

## Quick Start (Development)

### Backend
```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_exercises
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Seed Data
The app includes ~300 common Iranian gym exercises. Run:
```bash
python manage.py seed_exercises
```

## API Docs
Available at `/api/docs/` (Swagger) and `/api/schema/`.

## Features
- Coach authentication with JWT
- Athlete management with unique codes
- Exercise library with categories
- Program builder with one-day-at-a-time wizard
- Duplicate exercise detection
- Public shareable read-only links
- PWA support for mobile
- Persian RTL UI

## Deployment
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
