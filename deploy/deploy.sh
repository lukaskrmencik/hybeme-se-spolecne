#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_ROOT="${WEB_ROOT:-/var/www/hybemesespolecne}"
COMPOSE=(docker compose -f "$REPO_DIR/backend/compose.prod.yaml" --env-file "$REPO_DIR/backend/.env.production")

for required in "$REPO_DIR/backend/.env.production" "$REPO_DIR/frontend/.env.local"; do
    if [[ ! -f "$required" ]]; then
        echo "Chybí $required (je jen na serveru, ne v gitu)." >&2
        exit 1
    fi
done

cd "$REPO_DIR"
if [[ -z "${DEPLOY_UPDATED:-}" ]]; then
    echo "==> Stahuji novou verzi"
    git pull --ff-only
    DEPLOY_UPDATED=1 exec "$REPO_DIR/deploy/deploy.sh" "$@"
fi

echo "==> Backend"
"${COMPOSE[@]}" up -d --build --force-recreate --wait
"${COMPOSE[@]}" exec -T app php artisan migrate --force
"${COMPOSE[@]}" exec -T app php artisan optimize

echo "==> Offline mapa"
"$REPO_DIR/deploy/offline-map.sh" || echo "Offline mapu se nepodařilo připravit, web se nasadí bez ní." >&2

echo "==> Web"
docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e HOME=/tmp \
    -v "$REPO_DIR/frontend:/app" \
    -w /app \
    node:22-alpine \
    sh -c "npm ci --no-audit --no-fund --loglevel=error && npx expo export --platform web --output-dir dist && node scripts/precache-list.cjs dist"
mkdir -p "$WEB_ROOT"
rsync -a --delete "$REPO_DIR/frontend/dist/" "$WEB_ROOT/"

echo "==> Úklid starých obrazů"
docker image prune -f >/dev/null

echo "==> Hotovo: https://hybemesespolecne.cz"
