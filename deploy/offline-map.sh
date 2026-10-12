#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_DIR/frontend/public/offline-map/area.pmtiles"
BBOX="14.47,50.06,15.19,50.52"
MAX_ZOOM=14
PMTILES_VERSION="1.31.2"
TOOLS_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/hybeme-se-spolecne"
PMTILES="$TOOLS_DIR/pmtiles-$PMTILES_VERSION"

if [[ "${1:-}" != "--force" && -f "$OUT" && -z "$(find "$OUT" -mtime +90)" ]]; then
    echo "Offline mapa je aktuální."
    exit 0
fi

if [[ ! -x "$PMTILES" ]]; then
    case "$(uname -m)" in
        x86_64) arch="x86_64" ;;
        aarch64 | arm64) arch="arm64" ;;
        *) echo "Nepodporovaná architektura $(uname -m)." >&2; exit 1 ;;
    esac
    mkdir -p "$TOOLS_DIR"
    tmp="$(mktemp -d)"
    curl -fsSL "https://github.com/protomaps/go-pmtiles/releases/download/v$PMTILES_VERSION/go-pmtiles_${PMTILES_VERSION}_Linux_$arch.tar.gz" | tar -xz -C "$tmp" pmtiles
    mv "$tmp/pmtiles" "$PMTILES"
    rm -rf "$tmp"
fi

source_url=""
for days_ago in 0 1 2 3 4 5 6 7; do
    candidate="https://build.protomaps.com/$(date -u -d "-$days_ago day" +%Y%m%d).pmtiles"
    if curl -fsI "$candidate" >/dev/null; then
        source_url="$candidate"
        break
    fi
done
if [[ -z "$source_url" ]]; then
    echo "Nenašel jsem žádné aktuální mapové podklady na build.protomaps.com." >&2
    exit 1
fi

echo "Stahuji offline mapu z $source_url"
mkdir -p "$(dirname "$OUT")"
"$PMTILES" extract "$source_url" "$OUT.tmp" --bbox="$BBOX" --maxzoom="$MAX_ZOOM"
mv "$OUT.tmp" "$OUT"
echo "Offline mapa: $(du -h "$OUT" | cut -f1)"
