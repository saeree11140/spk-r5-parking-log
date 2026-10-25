#!/bin/sh
# Trigger a Dokploy deploy webhook and wait until production reports the
# expected commit.
#
#   WEBHOOK_URL=... EXPECTED_VERSION=<sha> dokploy-deploy.sh <backend|frontend> <version-url>
#
# Dokploy answers the webhook before the deploy runs, so a 200 only means
# "queued". Success is the service reporting EXPECTED_VERSION.
set -eu

kind=$1
version_url=$2
timeout=${TIMEOUT_SECONDS:-300}
interval=${INTERVAL_SECONDS:-10}
here=$(dirname "$0")

: "${WEBHOOK_URL:?WEBHOOK_URL is not set}"
: "${EXPECTED_VERSION:?EXPECTED_VERSION is not set}"

# Never echo WEBHOOK_URL: its path is the deploy token.
status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 30 -X POST "$WEBHOOK_URL") || status=000
if [ "$status" != 200 ]; then
  echo "$kind: webhook returned HTTP $status (Autodeploy off gives 400, wrong token 404)" >&2
  exit 1
fi
echo "$kind: deploy queued, waiting for $EXPECTED_VERSION"

waited=0
while [ "$waited" -lt "$timeout" ]; do
  sleep "$interval"
  waited=$((waited + interval))
  current=$("$here/deployed-version.sh" "$kind" "$version_url")
  if [ "$current" = "$EXPECTED_VERSION" ]; then
    echo "$kind: running $current after ${waited}s"
    exit 0
  fi
  echo "$kind: ${waited}s, running ${current:-unknown}"
done

echo "$kind: still not on $EXPECTED_VERSION after ${timeout}s; check the deployment log in Dokploy" >&2
exit 1
