---
name: Automatic contested areas
description: Why moving-sector conflicts are derived rather than stored as additional sectors.
---

Keep automatic contested shading non-destructive and derived from the source boundaries rather than creating additional editable sector records during a drag.

**Why:** Persisting an intersection on every border change risks duplicate and obsolete contested sectors, while clipping the original territory would prevent it from returning when the overlap ends. Manual contested sectors remain separate.

**How to apply:** Save source border edits normally and derive automatic overlaps on reload. Use both source sectors' configured colours, including custom colours, rather than assuming default faction colours.