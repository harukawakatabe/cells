#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
REPOSITORY="${CELLS_REPOSITORY:-harukawakatabe/cells}"
APP_ROOT="${CELLS_APP_ROOT:-$HOME/apps/cells}"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
DEPLOYED_SHA_FILE="$APP_ROOT/deployed-sha"
STABLE_SCRIPT="$APP_ROOT/deploy-mainland.sh"
HEALTH_URL="${CELLS_HEALTH_URL:-http://127.0.0.1:28100/api/health}"
PROJECT_NAME="${CELLS_PROJECT_NAME:-cells}"

if [[ ! "$BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "invalid branch name: $BRANCH" >&2
  exit 1
fi

if [[ ! "$REPOSITORY" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "invalid GitHub repository: $REPOSITORY" >&2
  exit 1
fi

mkdir -p "$APP_ROOT" "$RELEASES_DIR"

exec 9>"/tmp/cells-deploy.lock"
if ! flock -n 9; then
  echo "cells deployment is already running"
  exit 0
fi

github_api_curl() {
  curl --fail --location --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --retry 2 --retry-all-errors --retry-delay 3 \
    "$@"
}

TARGET_SHA="$(github_api_curl \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPOSITORY/git/ref/heads/$BRANCH" \
  | node -e 'let input=""; process.stdin.on("data", (chunk) => { input += chunk; }); process.stdin.on("end", () => { const data = JSON.parse(input); if (!data.object?.sha) process.exit(1); process.stdout.write(data.object.sha); });')"

if [[ ! "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "GitHub returned an invalid commit SHA: $TARGET_SHA" >&2
  exit 1
fi

CURRENT_SHA=""
if [[ -f "$DEPLOYED_SHA_FILE" ]]; then
  CURRENT_SHA="$(tr -d '[:space:]' < "$DEPLOYED_SHA_FILE")"
fi

RUNNING="$(docker ps --filter name='^/cells$' --filter status=running --format '{{.Names}}' 2>/dev/null || true)"
if [[ "$CURRENT_SHA" == "$TARGET_SHA" && "$RUNNING" == "cells" ]]; then
  if curl --fail --silent --show-error --max-time 10 "$HEALTH_URL" >/dev/null; then
    echo "cells is already healthy at $CURRENT_SHA"
    exit 0
  fi
  echo "cells is running but unhealthy; rebuilding current revision $CURRENT_SHA"
fi

RELEASE_DIR="$RELEASES_DIR/$TARGET_SHA"
if [[ ! -d "$RELEASE_DIR" ]]; then
  INCOMING_DIR="$(mktemp -d "$RELEASES_DIR/.incoming.XXXXXX")"
  cleanup() {
    rm -rf -- "$INCOMING_DIR"
  }
  trap cleanup EXIT

  ARCHIVE="$INCOMING_DIR/source.tar.gz"
  SOURCE_DIR="$INCOMING_DIR/source"
  mkdir -p "$SOURCE_DIR"
  curl --fail --location --silent --show-error \
    --connect-timeout 10 --max-time 300 \
    --retry 3 --retry-all-errors --retry-delay 3 --continue-at - \
    -o "$ARCHIVE" \
    "https://codeload.github.com/$REPOSITORY/tar.gz/$TARGET_SHA"
  tar -xzf "$ARCHIVE" --strip-components=1 -C "$SOURCE_DIR"

  for required in Dockerfile compose.mainland.yml scripts/deploy-mainland.sh; do
    if [[ ! -e "$SOURCE_DIR/$required" ]]; then
      echo "downloaded release is missing $required" >&2
      exit 1
    fi
  done

  mv "$SOURCE_DIR" "$RELEASE_DIR"
  trap - EXIT
  cleanup
fi

export CELLS_IMAGE_TAG="$TARGET_SHA"
docker compose -p "$PROJECT_NAME" -f "$RELEASE_DIR/compose.mainland.yml" build --pull
docker compose -p "$PROJECT_NAME" -f "$RELEASE_DIR/compose.mainland.yml" up -d --remove-orphans

for attempt in $(seq 1 45); do
  if curl --fail --silent --show-error --max-time 10 "$HEALTH_URL" >/dev/null 2>&1; then
    ln -sfn "$RELEASE_DIR" "$APP_ROOT/current.next"
    mv -Tf "$APP_ROOT/current.next" "$CURRENT_LINK"
    printf '%s\n' "$TARGET_SHA" > "$APP_ROOT/deployed-sha.next"
    mv -f "$APP_ROOT/deployed-sha.next" "$DEPLOYED_SHA_FILE"
    install -m 0755 "$RELEASE_DIR/scripts/deploy-mainland.sh" "$APP_ROOT/deploy-mainland.sh.next"
    mv -f "$APP_ROOT/deploy-mainland.sh.next" "$STABLE_SCRIPT"
    echo "cells deployed successfully at $TARGET_SHA"
    docker compose -p "$PROJECT_NAME" -f "$RELEASE_DIR/compose.mainland.yml" ps
    exit 0
  fi
  sleep 2
done

docker compose -p "$PROJECT_NAME" -f "$RELEASE_DIR/compose.mainland.yml" logs --tail=120 cells >&2
echo "cells health check failed after deployment" >&2
exit 1
