#!/bin/sh
# Daily local backup of the production database on the VPS.
#
# Dumps the Dokploy Postgres service with pg_dump -Fc into BACKUP_DIR and
# deletes dumps older than 7 days. The off-site copy is Dokploy's own backup
# to Backblaze B2; this one only covers fast restores and B2 outages.
#
# Install as root: /usr/local/sbin/spk-r5-local-backup, cron 30 19 * * * (UTC).
set -eu

BACKUP_DIR=/var/backups/spk-r5
DB_CONTAINER_FILTER=spkr5parkinglog-spkr5db
KEEP_DAYS=7

umask 077
mkdir -p "$BACKUP_DIR"

container=$(docker ps -q -f "name=$DB_CONTAINER_FILTER" | head -1)
if [ -z "$container" ]; then
  echo "$(date -u +%FT%TZ) no running container matches $DB_CONTAINER_FILTER" >&2
  exit 1
fi

target="$BACKUP_DIR/spk_r5_parking_log-$(date -u +%Y%m%dT%H%M%SZ).dump"

# POSTGRES_USER and POSTGRES_DB are set by Dokploy inside the container.
if ! docker exec "$container" sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$target.tmp" \
  || [ ! -s "$target.tmp" ]; then
  rm -f "$target.tmp"
  echo "$(date -u +%FT%TZ) pg_dump failed" >&2
  exit 1
fi
mv "$target.tmp" "$target"

# -mtime +6 matches files at least 7 full days old.
find "$BACKUP_DIR" -name 'spk_r5_parking_log-*.dump' -mtime +$((KEEP_DAYS - 1)) -delete

echo "$(date -u +%FT%TZ) wrote $target ($(wc -c < "$target") bytes)"
