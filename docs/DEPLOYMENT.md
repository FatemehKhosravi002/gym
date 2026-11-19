# Deployment Guide (production, Docker Compose + HTTPS)

This is the runbook for the files that exist in this repo:
`docker-compose.prod.yml`, `backend/Dockerfile.prod`, `frontend/Dockerfile.prod`,
`nginx/nginx.prod.conf`, `.env.example.prod`, `backup_full.sh`.

Reference machine: Ubuntu 22.04/24.04 VPS, 2 GB RAM / 2 vCPU (the frontend build and the
WeasyPrint PDF renderer both need memory).

## 0. Before you start

- A domain (`example.com`, optionally `www.example.com`) whose **A/AAAA records point at the
  server IP**. HTTPS cannot be issued before DNS is live.
- Firewall open on `22`, `80`, `443`.
- The repo is private: add a deploy key or clone over HTTPS with a token.

Only `80`/`443` are published (by the `nginx` service). Postgres, Django (`8000`) and the
frontend container stay inside the `gym_network` bridge, so do **not** add `ports:` to them.

## 1. Server preparation

```bash
ssh root@SERVER_IP

adduser gymuser && usermod -aG sudo gymuser
# copy your public key, then test the login in a second terminal before hardening ssh
rsync --archive --chown=gymuser:gymuser /root/.ssh /home/gymuser

apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
usermod -aG docker gymuser

ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

Open a **second terminal**, confirm `ssh gymuser@SERVER_IP` works with the key, and only then
set `PermitRootLogin no` and `PasswordAuthentication no` in `/etc/ssh/sshd_config`
(`systemctl restart ssh`).

## 2. Get the code

```bash
su - gymuser
git clone git@github.com:FatemehKhosravi002/gym.git gym
cd gym
mkdir -p certbot/conf certbot/www backups
```

## 3. Configure the environment (single `.env`)

`docker-compose.prod.yml` reads **one** env file, `.env` in the repo root, for `db`,
`backend` and `nginx`. There is no `backend/.env.production` any more.

```bash
cp .env.example.prod .env
python3 -c "import secrets; print(secrets.token_urlsafe(50))"   # SECRET_KEY
nano .env
chmod 600 .env
```

| Variable | Notes |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | used by the `postgres:16` image |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST=db`, `DB_PORT=5432` | used by Django; **must match** the `POSTGRES_*` values (`DATABASE_URL` is not read by `settings.py`) |
| `SECRET_KEY` | the generated value; never commit `.env` |
| `DEBUG=False` | |
| `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` | your domains, comma separated, no spaces |
| `FRONTEND_BASE_URL` | `https://example.com` - absolute base for share links + PDF QR codes |
| `SECURE_SSL_REDIRECT`, `*_COOKIE_SECURE`, `SECURE_HSTS_*`, `SECURE_PROXY_SSL_HEADER` | keep the template values |

## 4. Point nginx at your domain

`nginx/nginx.prod.conf` was written for `physiquegym.ir`; the domain appears in `server_name`
and in both `ssl_certificate` paths.

```bash
sed -i 's/physiquegym\.ir/example.com/g' nginx/nginx.prod.conf
grep -n 'server_name\|ssl_certificate' nginx/nginx.prod.conf
```

## 5. Issue the TLS certificate (before nginx can start)

`nginx/nginx.prod.conf` loads `/etc/letsencrypt/live/<domain>/fullchain.pem`, so nginx will
crash-loop if you start it first. Issue the certificate while port 80 is still free:

```bash
# add --staging once first to avoid Let's Encrypt rate limits, then re-run without it
docker run --rm -p 80:80 \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly --standalone --agree-tos --no-eff-email \
  -m you@example.com -d example.com -d www.example.com

ls certbot/conf/live/example.com/     # fullchain.pem privkey.pem
```

Renewals later use the `--webroot` path (`/.well-known/acme-challenge/` is already proxied
through the mounted `certbot/www` volume), so this standalone run is a one-time step.

## 6. Build and start the stack

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

On start the `backend` container runs `migrate --noinput`, `collectstatic --noinput` and then
gunicorn (3 workers, 120 s timeout). Watch it come up:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx      # should NOT loop on ssl_certificate
```

## 7. First-run data

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_exercises
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

`createsuperuser` leaves `role='coach'` and `is_approved=False`, and
`CustomTokenObtainPairSerializer` rejects approved-less coaches. Approve your admin account:

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py shell -c \
  "from django.contrib.auth import get_user_model as u; u().objects.filter(username='YOUR_ADMIN').update(role='admin', is_approved=True)"
```

## 8. Verify

```bash
curl -I https://example.com                 # 200, HSTS header present
curl -s https://example.com/api/schema/ -o /dev/null -w '%{http_code}\n'   # 200
curl -s https://example.com/admin/login/ -o /dev/null -w '%{http_code}\n'  # 200
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```


## 9. Redeploy after a `git pull`

```bash
cd /home/gymuser/gym
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d      # recreates only changed services
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
```

`collectstatic` and `migrate` also run automatically on every `backend` container start.

## 10. Backups (cron)

`backup_full.sh` dumps Postgres (gzip) and the media volume, then deletes files older than
7 days. It reads `POSTGRES_USER`/`POSTGRES_DB` from the repo `.env`, so keep the script inside
the project directory.

```bash
chmod +x backup_full.sh
crontab -e
```

```cron
0 2 * * * cd /home/gymuser/gym && ./backup_full.sh >> /home/gymuser/gym/backups/backup.log 2>&1
30 3 * * 0 cd /home/gymuser/gym && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload >> /home/gymuser/gym/backups/nginx_reload.log 2>&1
```

The weekly reload picks up renewed certificates (the `certbot` service renews twice a day but
cannot reload nginx itself).

Copy the dumps off the server regularly:

```bash
rsync -avz gymuser@SERVER_IP:/home/gymuser/gym/backups/ ./backups/
```

### Restore

```bash
cd /home/gymuser/gym
docker compose -f docker-compose.prod.yml stop backend
zcat backups/gym_db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
# media volume
docker run --rm -v gym_media_data_prod:/data -v "$PWD/backups":/backup alpine \
  sh -c 'rm -rf /data/* && tar -xzf /backup/gym_media_YYYYMMDD_HHMMSS.tar.gz -C /data'
docker compose -f docker-compose.prod.yml start backend
```

## 11. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `nginx` restarts in a loop, `cannot load certificate` | step 5 not done, or the domain in `nginx/nginx.prod.conf` differs from the certificate name |
| `502 Bad Gateway` on `/api/` | backend down: `docker compose -f docker-compose.prod.yml logs backend`; usually `DB_*` not matching `POSTGRES_*`, or `db` not healthy yet |
| Login answers `حساب شما ثبت شد و پس از تأیید ادمین…` | account is `role='coach'` with `is_approved=False` -> run the `update(...)` from step 7 |
| Static files 404 | `collectstatic` failed at start (check `logs backend`) or the `static_data_prod` volume is not mounted in `nginx` |
| PDF renders without Persian glyphs | `backend/fonts/` missing from the build context - it must not be excluded by `.dockerignore` |
| `permission denied /var/run/docker.sock` | `newgrp docker` (or re-login) after adding the user to the `docker` group |
| Image build is very slow / fails to reach registries | see the mirrors section in `DEPLOYMENT_GUIDE_CORRECTED.md` (`/etc/docker/daemon.json`); pip/npm mirrors are already pinned in the Dockerfiles |
| Disk full | `docker system prune -af` (never `--volumes` unless you have a backup) |

## 12. Not implemented (do not rely on these)

- `USE_S3` / `AWS_*`: `settings.py` does not read them; media lives on the `media_data_prod`
  volume and is served by nginx from `/media/`.
- `DATABASE_URL`: also unused, `DB_*` is what Django reads.
- `python manage.py purge_trash`: no such command exists in this repo (the old guide's cron
  line would fail every night); trashing/purging is done from the UI/API
  (`POST /api/athletes/{id}/purge/`).
- The `certbot` service's `entrypoint` cannot reload nginx (nginx is not installed in that
  image); that is why step 10 adds the weekly nginx reload.
