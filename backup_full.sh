#!/bin/bash
# Nightly backup: Postgres dump (gzip) + media volume, 7 day retention.
# Run it from the project directory (cron does: cd /home/gymuser/gym && ./backup_full.sh).
set -uo pipefail

cd "$(dirname "$0")" || exit 1

COMPOSE_FILE="$PWD/docker-compose.prod.yml"
BACKUP_DIR="$PWD/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# POSTGRES_USER / POSTGRES_DB live in the compose env file. Without this the script
# would silently dump the default database name.
if [ -f .env ]; then
    set -a
    . ./.env
    set +a
fi
POSTGRES_USER=${POSTGRES_USER:-gym_prod_user}
POSTGRES_DB=${POSTGRES_DB:-gym_prod}

# Database backup
DB_FILE="$BACKUP_DIR/gym_db_${DATE}.sql.gz"
if ! docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DB_FILE"; then
    echo "database backup FAILED ($DB_FILE removed)" >&2
    rm -f "$DB_FILE"
    exit 1
fi

# Media backup. The volume is named <project-directory>_media_data_prod, so resolve it
# instead of hardcoding the project name.
MEDIA_VOLUME=$(docker volume ls -q --filter name=media_data_prod | head -n 1)
MEDIA_FILE="$BACKUP_DIR/gym_media_${DATE}.tar.gz"
if [ -n "$MEDIA_VOLUME" ]; then
    docker run --rm -v "$MEDIA_VOLUME:/data:ro" -v "$BACKUP_DIR:/backup" alpine \
        tar -czf "/backup/gym_media_${DATE}.tar.gz" -C /data .
else
    echo "media volume not found, skipping media backup" >&2
fi

# Retention: 7 days
find "$BACKUP_DIR" -name "gym_db_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "gym_media_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $(basename "$DB_FILE")${MEDIA_VOLUME:+ and $(basename "$MEDIA_FILE")}"
