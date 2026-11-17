# Routes mapping

## Backend (core)
- /admin/ - Django admin
- /api/schema/ - OpenAPI schema
- /api/docs/ - Swagger UI
- /api/users/ - includes users urls (me, register, change-password, pending-coaches, reset-coach-password, token, token/refresh)
- /api/athletes/ - athletes
- /api/library/ - categories/exercises
- /api/programs/ - programs
- /api/program-days/ - program days
- /api/program-items/ - program items
- /api/program-templates/ - program templates (+ create-from-program, apply-to-athlete)
- /api/program-template-days/ - template days
- /api/program-template-items/ - template items
- /api/admin/ - admin panel

## Frontend (React Router)
- / - landing
- /login, /register, /install - auth and PWA install
- /public/program/:token - public program share
- /dashboard - dashboard
- /athletes, /athletes/:id - athletes list and detail
- /programs/builder/:athleteId - program builder
- /programs/:id - program detail
- /programs/:id/edit - program edit (header, days, items)
- /templates, /templates/new, /templates/:id/edit - program templates
- /library - exercise library
- /pending-coaches, /system-admin - admin area
