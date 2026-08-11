---
name: Custom DB fallback trap
description: If CUSTOM_DATABASE_URL secret goes missing, the app silently falls back to the built-in DB with seed data — looks like data loss / schema drift.
---
The app connects via `CUSTOM_DATABASE_URL || DATABASE_URL`. If the CUSTOM_DATABASE_URL secret disappears (happened 2026-08-11), the app silently falls back to the built-in Replit DB, which has only seed data (a handful of planets/sectors) and lacks migrated columns — presenting as "columns missing" startup crashes and "my data disappeared" reports.

**Why:** the fallback is silent; nothing warns that the wrong DB is in use. Real data (888 planets, 25 sectors) is untouched at the custom DB.

**How to apply:** on any "data disappeared" or missing-column report, FIRST check `!!process.env.CUSTOM_DATABASE_URL` before assuming schema drift or repairing columns. If missing, request the secret back via requestSecrets, restart the workflow, then re-apply any migrations made while pointed at the fallback DB (they went to the wrong database). Migration scripts need `neonConfig.webSocketConstructor = ws` or the connection fails.
