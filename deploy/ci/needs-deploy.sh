#!/bin/sh
# Decide whether a service must be deployed: compare the commit production
# runs with HEAD over the paths that go into its image.
#
#   needs-deploy.sh <deployed-sha or empty> <path>...
#
# Prints "true" or "false". Comparing against what production runs, not the
# previous push, means a run cancelled halfway cannot leave a change behind.
set -u

deployed=$1
shift

if [ -z "$deployed" ] || ! git cat-file -e "$deployed^{commit}" 2>/dev/null; then
  echo true
elif git diff --quiet "$deployed" HEAD -- "$@"; then
  echo false
else
  echo true
fi
