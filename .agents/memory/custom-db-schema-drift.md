---
name: Custom DB schema drift
description: Live CUSTOM_DATABASE_URL database can lose previously-migrated columns; how to detect and repair.
---
The live DB (CUSTOM_DATABASE_URL, 886 planets) has been observed to lose columns that were previously migrated (e.g. all users.can_edit_* perms, planets.settlements, fleets.color/theatre_x/theatre_y/warzone_planet_id vanished on 2026-08-11), crashing the server at startup with "column ... does not exist".

**Why:** the DB appears to get reset/rolled back outside our control, so schema migrations are not guaranteed durable.

**How to apply:** when the server fails with a missing-column error, don't assume one column — diff `information_schema.columns` against `shared/schema.ts` for ALL tables and re-add every gap with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`. Use a temp tsx script in the workspace root with `@neondatabase/serverless` Pool + `neonConfig.webSocketConstructor = ws` (required, otherwise WebSocket connect fails) and `CUSTOM_DATABASE_URL || DATABASE_URL`. Then restart the workflow and curl a data endpoint to confirm.
