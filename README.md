# Gym Program Builder

Complete, production-ready web application for gym coaches in Iran to build bodybuilding programs.

## Tech Stack
- Backend: Django + DRF, PostgreSQL, JWT (SimpleJWT)
- Frontend: React + Vite + TypeScript + Tailwind CSS, PWA
- Persian (fa-IR), RTL, Vazirmatn, Jalali dates
- PDF: WeasyPrint
- Docker + docker-compose

## Quick Start (Local, no Docker)

Use `gym_backend.settings_dev` locally: it keeps the defaults from `settings.py`
but switches the database to SQLite (`backend/dev.sqlite3`) and enables
`CORS_ALLOW_ALL_ORIGINS` so the Vite dev server on port 5173 can call Django on
port 8000.

### Backend (Django on http://127.0.0.1:8000)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt

export DJANGO_SETTINGS_MODULE=gym_backend.settings_dev
python manage.py migrate
python manage.py seed_exercises        # ~300 exercises, safe to re-run
python manage.py createsuperuser       # then set is_approved=True (see note)
python manage.py runserver 127.0.0.1:8000
```

> `settings.py` (the default) reads Postgres from `DB_HOST` (default `db`), which
> only resolves inside docker-compose. Without `DJANGO_SETTINGS_MODULE` the
> `migrate`/`runserver` commands will fail to connect.

> Login note: `CustomTokenObtainPairSerializer` rejects accounts with
> `role='coach'` and `is_approved=False`. `createsuperuser` leaves the default
> role `coach`, so approve it once:
> ```bash
> python manage.py shell -c "from django.contrib.auth import get_user_model; get_user_model().objects.filter(username='YOUR_USER').update(is_approved=True, role='admin')"
> ```
> or flip the account at `/admin/` → Users.

API docs: http://127.0.0.1:8000/api/docs/ · schema: http://127.0.0.1:8000/api/schema/ · admin: http://127.0.0.1:8000/admin/

### Frontend (Vite on http://127.0.0.1:5173)
```bash
cd frontend
npm install
# create .env.local with the backend URL (the app defaults to the relative "/api",
# which only works behind nginx in production)
echo 'VITE_API_URL=http://localhost:8000/api' > .env.local
npm run dev
```

Open http://127.0.0.1:5173 — register a coach at `/register` (auto-approved unless
`registration_requires_approval` is enabled in `/admin/`) or log in with a superuser.

### PDF export note
WeasyPrint needs its native deps (`libpango`, `libcairo`, `libgdk-pixbuf`) and the
Sahel fonts in `backend/fonts`. On Debian/Ubuntu:
`sudo apt install libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf-2.0-0`.

## Full Stack with Docker
```bash
cp backend/.env.example backend/.env   # then set SECRET_KEY etc.
docker compose up --build
```
Frontend: http://localhost:3000 · API through the same origin at `/api/`.

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

## Deployment (production server)

Full runbook: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Persian quick checklist:
[DEPLOYMENT_GUIDE_CORRECTED.md](DEPLOYMENT_GUIDE_CORRECTED.md)). Short version, on the server:

```bash
git clone git@github.com:FatemehKhosravi002/gym.git gym && cd gym
mkdir -p certbot/conf certbot/www backups
cp .env.example.prod .env && nano .env          # POSTGRES_*/DB_*, SECRET_KEY, ALLOWED_HOSTS, FRONTEND_BASE_URL
sed -i 's/physiquegym\.ir/YOUR_DOMAIN/g' nginx/nginx.prod.conf
# 1) certificate first - nginx cannot start without it
docker run --rm -p 80:80 -v "$PWD/certbot/conf:/etc/letsencrypt" certbot/certbot \
  certonly --standalone -d YOUR_DOMAIN -d www.YOUR_DOMAIN --agree-tos --no-eff-email -m YOU@MAIL
# 2) stack
docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d
# 3) data
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_exercises
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

Then approve the admin account (`role='admin'`, `is_approved=True`) - see step 7 of the runbook,
otherwise the API login is rejected.
