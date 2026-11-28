#!/usr/bin/env bash
# Backs up everything the app keeps: the Postgres database (pg_dump, consistent while the app runs), the shared AI keys
# and the media files. Run on the server, in the repository folder:  ./scripts/backup.sh
# Writes data/backups/<UTC time>/ {db.dump, settings.json, media.tar.gz} and keeps the newest AVS_BACKUP_KEEP (7).
# With a managed Postgres (DATABASE_URL in .env, no postgres service), use that provider's backups for the database.
set -euo pipefail
cd "$(dirname "$0")/.."
KEEP="${AVS_BACKUP_KEEP:-7}"
OUT="data/backups/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$OUT" && chmod 700 "$OUT"

docker compose exec -T postgres pg_dump -U avs -d avs -Fc > "$OUT/db.dump"
[ -f data/settings.json ] && cp data/settings.json "$OUT/settings.json"
[ -d data/media ] && tar -czf "$OUT/media.tar.gz" -C data media

ls -1d data/backups/*/ | sort | head -n -"$KEEP" | xargs -r rm -rf
du -sh "$OUT"/* | sed "s|^|backup $OUT: |"
