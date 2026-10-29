#!/bin/bash
BACKUP_DIR="/home/gymuser/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
docker compose -f /home/gymuser/gym/docker-compose.prod.yml exec -T db pg_dump -U ${POSTGRES_USER:-gym_prod_user} ${POSTGRES_DB:-gym_prod} | gzip > $BACKUP_DIR/gym_db_${DATE}.sql.gz

# Media backup
tar -czf $BACKUP_DIR/gym_media_${DATE}.tar.gz -C /var/lib/docker/volumes/gym_media_data_prod/_data . 2>/dev/null || docker run --rm -v gym_media_data_prod:/data -v $BACKUP_DIR:/backup alpine tar -czf /backup/gym_media_${DATE}.tar.gz -C /data .

# Remove backups older than 7 days
find $BACKUP_DIR -name "gym_db_*.sql.gz" -mtime +7 -exec rm {} \;
find $BACKUP_DIR -name "gym_media_*.tar.gz" -mtime +7 -exec rm {} \;

echo "Backup completed: gym_db_${DATE}.sql.gz and gym_media_${DATE}.tar.gz"
