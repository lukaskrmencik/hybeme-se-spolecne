#!/usr/bin/env bash
# Daily database dump (keeps the last 14) and a mirror of uploaded photos. Cron (crontab -e):
#   30 3 * * * /mnt/HC_Volume_107027704/hybeme-se-spolecne/deploy/backup-db.sh >> /mnt/HC_Volume_107027704/backups/backup.log 2>&1
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/mnt/HC_Volume_107027704/backups}"
ENV_FILE="$REPO_DIR/backend/.env.production"

DB_DATABASE="$(grep -E '^DB_DATABASE=' "$ENV_FILE" | cut -d= -f2-)"
DB_USERNAME="$(grep -E '^DB_USERNAME=' "$ENV_FILE" | cut -d= -f2-)"

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/db-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose -f "$REPO_DIR/backend/compose.prod.yaml" --env-file "$ENV_FILE" \
    exec -T pgsql pg_dump -U "$DB_USERNAME" "$DB_DATABASE" | gzip > "$file"
echo "$(date '+%F %T') záloha $file ($(du -h "$file" | cut -f1))"

ls -1t "$BACKUP_DIR"/db-*.sql.gz | tail -n +15 | xargs -r rm --

# Uploaded photos and avatars: a mirror of the storage volume (new files are added, nothing is removed,
# so a photo deleted by mistake can still be restored).
mkdir -p "$BACKUP_DIR/storage"
docker run --rm \
    -v hybeme-se-spolecne_storage:/src:ro \
    -v "$BACKUP_DIR/storage":/dst \
    alpine cp -a -n /src/app/public/. /dst/
echo "$(date '+%F %T') fotky zálohovány do $BACKUP_DIR/storage ($(du -sh "$BACKUP_DIR/storage" | cut -f1))"
