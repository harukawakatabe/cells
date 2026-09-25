#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="${CELLS_APP_DIR:-$HOME/apps/cells}"
COMPOSE_FILE="${CELLS_COMPOSE_FILE:-compose.mainland.yml}"
HEALTH_URL="${CELLS_HEALTH_URL:-http://127.0.0.1:28100/api/health}"

exec 9>"/tmp/cells-deploy.lock"
if ! flock -n 9; then
  echo "cells deployment is already running"
  exit 0
fi

cd "$APP_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "refusing to deploy from a dirty server checkout" >&2
  exit 1
fi

fetch_branch() {
  for attempt in 1 2 3 4; do
    if git -c http.version=HTTP/1.1 fetch --prune origin "$BRANCH"; then
      return 0
    fi
    echo "GitHub fetch attempt $attempt failed; retrying" >&2
    sleep $((attempt * 5))
  done
  echo "GitHub fetch failed after 4 attempts" >&2
  return 1
}

fetch_branch
CURRENT_SHA="$(git rev-parse HEAD)"
TARGET_SHA="$(git rev-parse "origin/$BRANCH")"
RUNNING="$(docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null || true)"

if [[ "$CURRENT_SHA" == "$TARGET_SHA" ]] && grep -qx "cells" <<<"$RUNNING"; then
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null; then
    echo "cells is already healthy at $CURRENT_SHA"
    exit 0
  fi
  echo "cells is running but unhealthy; rebuilding current revision $CURRENT_SHA"
fi

git checkout "$BRANCH"
git merge --ff-only "origin/$BRANCH"

docker compose -f "$COMPOSE_FILE" build --pull
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

for attempt in $(seq 1 45); do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null 2>&1; then
    DEPLOYED_SHA="$(git rev-parse HEAD)"
    echo "cells deployed successfully at $DEPLOYED_SHA"
    docker compose -f "$COMPOSE_FILE" ps
    exit 0
  fi
  sleep 2
done

docker compose -f "$COMPOSE_FILE" logs --tail=120 cells >&2
echo "cells health check failed after deployment" >&2
exit 1
