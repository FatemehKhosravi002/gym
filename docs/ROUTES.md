# Routes mapping

## Backend (core)
- /admin/ - Django admin
- /api/schema/ - OpenAPI schema
- /api/docs/ - Swagger UI
- /api/users/ - includes users urls (me, register, change-password, pending-coaches, reset-coach-password, token, token/refresh)
- /api/athletes/ - athletes (search=..., level=, has_note=, has_programs=, active=, ordering=, page=)
  - /api/athletes/?deleted=1 and /api/athletes/trash/ - soft-deleted (trash)
  - /api/athletes/{id}/restore/ - restore from trash
  - /api/athletes/{id}/purge/ - permanent delete (body: {"confirm_code": "<unique_code>"})
  - /api/athletes/{id}/measurements/ - list (asc, live only) / create
  - /api/athletes/{id}/measurements/{m_id}/ - GET / PATCH / DELETE
  - /api/athletes/{id}/profile/ - public-link flags
  - /api/athletes/{id}/exercise_history/?exercise_id=X&exclude_program=Y - repeat history
    `{count, last, programs:[{id, sequence_number, date, date_jalali, day_index, sets, reps}]}`,
    newest first; drafts and final programmes count, archived ones are ignored (one query)
  - /api/athletes/{id}/repeat_counts/?exercise_ids=1,2,3&exclude_program=Y - `{counts: {id: n}}`
    for the «تکرار ×N» badges (one query)
  - /api/athletes/{id}/frequent_exercises/ - top 10 exercises of a student (student page section)
  - /api/athletes/search_combined/?q= - compact search (also typo-tolerant)
- /api/programs/duplicate_check/?athlete_id=&exercise_id=&exclude_program= - legacy single-hit check,
  kept in sync with exercise_history (same query helper)
- /api/programs/?athlete={id} - filter programs by athlete (student page history)
- /api/library/ - categories/exercises
- /api/programs/ - programs (+ share, regenerate_token, duplicate, trash, restore)
- /api/programs/{id}/pdf/ - authenticated A4 PDF (owner coach only, deleted programmes are 404)
- /api/programs/public/{token}/ - public read-only programme (no coach/notes fields)
- /api/programs/public/{token}/pdf/ - public A4 PDF for the share page
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
- /athletes/trash - soft-deleted athletes (restore / purge after typing the code)
- /programs/builder/:athleteId - program builder
- /programs/:id - program detail
- /programs/:id/edit - program edit (header, days, items)
- /templates, /templates/new, /templates/:id/edit - program templates
- /library - exercise library
- /pending-coaches, /system-admin - admin area
