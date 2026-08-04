#!/bin/bash
# Post-merge setup: runs automatically after a task branch is merged.
# Keep idempotent, non-interactive, and fast.
set -e

# Install any new dependencies added by the merged task
npm install --no-audit --no-fund

# NOTE: database schema changes in this project are applied via explicit SQL
# migrations (the app DB is set by CUSTOM_DATABASE_URL). Do not run
# `drizzle-kit push --force` here automatically — it can drop columns/data on
# schema drift. Apply schema changes deliberately instead.
