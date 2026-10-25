#!/bin/sh
# Print the commit SHA a production service is running, or nothing.
#
#   deployed-version.sh backend  https://parking.spkr5.com/api/health
#   deployed-version.sh frontend https://parking.spkr5.com/version.txt
#
# Prints only a full 40-character SHA. Anything else (unreachable, "dev",
# an older image without a version, the SPA fallback page) prints nothing,
# which the caller treats as "deploy".
set -u

kind=$1
url=$2

body=$(curl -fsS --max-time 10 "$url" 2>/dev/null) || exit 0

case $kind in
  backend) version=$(printf '%s' "$body" | jq -r '.version // empty' 2>/dev/null) ;;
  frontend) version=$(printf '%s' "$body" | tr -d '[:space:]') ;;
  *) echo "unknown kind: $kind" >&2; exit 2 ;;
esac

if printf '%s' "$version" | grep -Eq '^[0-9a-f]{40}$'; then
  printf '%s\n' "$version"
fi
