#!/usr/bin/env bash
# Daily database dump and photo archive, the last 14 of each are kept. Cron (crontab -e):
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

# Uploaded photos and avatars: a daily archive, kept 14 days like the database. A deleted account or
# photo must disappear from the backups too (the privacy policy promises at most 14 days).
photos="$BACKUP_DIR/photos-$(date +%Y-%m-%d_%H%M).tar.gz"
docker run --rm \
    -v hybeme-se-spolecne_storage:/src:ro \
    alpine tar -czf - -C /src/app public > "$photos"
echo "$(date '+%F %T') fotky $photos ($(du -h "$photos" | cut -f1))"

ls -1t "$BACKUP_DIR"/photos-*.tar.gz | tail -n +15 | xargs -r rm --
rm -rf "$BACKUP_DIR/storage"   # the former never-deleted mirror
