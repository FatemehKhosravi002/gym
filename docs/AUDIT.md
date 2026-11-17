# Audit — Blockers

Audited on: repo `main` (stage: program templates). Scope: the five areas flagged for
this stage — routes, migrations, seed path, admin CSRF settings, token refresh, and
undefined colour classes in the frontend.

> Note: this file did not exist in the repository when the auditor started. The
> findings below were produced by checking the code and running the commands, and are
> kept here as the record for this stage.

## 1. Routes — no blocker

- `python manage.py check_routes` → `All routes resolved`.
- `/api/program-days/`, `/api/program-items/`, `/api/program-templates/`,
  `/api/program-template-days/`, `/api/program-template-items/` are all mounted in
  `gym_backend/urls.py` and listed in `docs/ROUTES.md`.
- Fixed while auditing: two auth tests posted to `/api/token/` (404), so they passed
  for the wrong reason. They now hit `/api/users/token/` and assert `401`.

## 2. Migrations — no blocker

- `python manage.py makemigrations --check --dry-run` → *No changes detected*.
- `migrate` on a clean database applies every migration without error
  (`apps.admin_panel` has no models, so no migrations — expected).

## 3. Seed path — **blocker, fixed**

- Root cause: `seed_exercises` walked five `dirname()` levels and then fell back to the
  hard-coded `/home/bahar/gym/exercises_seed.json`. Inside the backend image
  (`WORKDIR /app`, `COPY . /app/`) that path does not exist and the repo-root JSON is
  not part of the build context, so seeding the library in production always failed.
- Fix: candidates resolved in order — `SEED_EXERCISES_PATH`, `BASE_DIR/data/exercises_seed.json`,
  `BASE_DIR/exercises_seed.json`, `BASE_DIR.parent/exercises_seed.json`; new `--path`
  flag; `CommandError` with the searched paths instead of a traceback. The data file is
  now shipped inside the image at `backend/data/exercises_seed.json`.
- Packaging is idempotent (`get_or_create`), safe to run on every deploy.
- Tests: `apps/core/tests/test_seed_command.py`.

## 4. Admin / CSRF settings — **blocker, fixed**

- Root cause: the bottom of `settings.py` re-set `SESSION_COOKIE_SECURE = True`,
  `CSRF_COOKIE_SECURE = True` and `SECURE_PROXY_SSL_HEADER` unconditionally, overriding
  the env-driven block above it. On plain HTTP (local, or a health check inside the
  compose network) the session/CSRF cookies were `Secure` and `/admin/` login replied
  `403 CSRF verification failed`. Additionally an *empty* `CSRF_TRUSTED_ORIGINS=` line in
  an env file produced `[]` (the default was skipped), so an HTTPS POST to
  `https://physiquegym.ir` failed CSRF too.
- Fix: one env-driven block with the duplicates removed; empty env values now fall back
  to the default (`_env_bool`, `_csv`); defaults are `DEBUG`-aware — cookies are
  `Secure` only when `DEBUG` is off, and `CSRF_TRUSTED_ORIGINS` defaults to
  `https://physiquegym.ir,https://www.physiquegym.ir`. Nothing in `nginx/`, `certbot/`
  or the compose files was touched, and env files keep the last word.
- Tests: `apps/core/tests/test_security_settings.py` (admin login page renders, parsers).

## 5. Token refresh — **blocker, fixed**

- Root cause: refresh used plain `TokenRefreshView`, which only verifies the token
  signature. A deactivated or un-approved account could keep minting access tokens for
  the whole refresh lifetime (7 days), bypassing the login checks.
- Fix: `ActiveUserTokenRefreshSerializer` + `ActiveTokenRefreshView` at
  `/api/users/token/refresh/`: refresh returns `401` when the user is missing, inactive,
  or an un-approved coach; invalid tokens still return `401`.
- Tests: `apps/users/tests/test_token_refresh.py`.

## 6. Registration without approval — **blocker in tests, fixed**

- `AppSettings.registration_requires_approval` defaults to `False`, so registration
  activates the account immediately and returns tokens. The system admin panel keeps the
  switch (`/api/admin/settings/`). An outdated test still asserted "unapproved", it now
  covers both modes — `apps/users/tests/test_auth.py`.

## 7. Undefined / hard-coded colours — **blocker, fixed by the redesign**

- The old UI mixed raw hex (`#B6F500`, `#1B1F1D`, `#9AA3A0`, `rgba(255,255,255,.08)`) with
  Tailwind tokens, plus `!important` overrides in `index.css` that forced every
  `input/select/textarea` to a dark background — which broke any light surface and made
  form text unreadable (white on white).
- Fix: the whole palette now comes from `tailwind.config.js` tokens + CSS variables
  (see `docs/DESIGN.md`); the `!important` overrides are gone; no page uses the old
  colours. A guard test fails the build on stray dark-theme hex values
  (`frontend/scripts/check-colors.mjs`).

## Re-run

```bash
cd backend && python manage.py check && python manage.py makemigrations --check --dry-run
python manage.py test apps.core.tests apps.users.tests
cd ../frontend && npm run build && node scripts/check-colors.mjs
```
