#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "========================================"
echo " Galaxy Map Updater"
echo "========================================"

if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "ERROR: Tracked files have uncommitted changes."
    echo "Commit or otherwise safely preserve them before deploying."
    git status --short
    exit 1
fi

echo "Fetching latest code..."
git fetch --prune origin main

echo "Updating local branch..."
git merge --ff-only origin/main

echo "Rebuilding Docker image..."
docker compose build

echo "Restarting application..."
docker compose up -d

echo
echo "Current container status:"
docker compose ps

echo
echo "Update complete."
