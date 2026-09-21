---
name: Automatic contested areas
description: Why moving-sector conflicts are derived rather than stored as additional sectors.
---

Keep automatic contested shading non-destructive and derived from the source boundaries rather than creating additional editable sector records during a drag.

**Why:** Persisting an intersection on every border change risks duplicate and obsolete contested sectors, while clipping the original territory would prevent it from returning when the overlap ends. Manual contested sectors remain separate.

**How to apply:** Save source border edits normally and derive automatic overlaps on reload. Use both source sectors' configured colours, including custom colours, rather than assuming default faction colours.

Recognised enclaves are explicit exceptions, not a general exemption for all fully contained territories.

**Why:** The user identified The Meridian as a peaceful enclave within The Empire. That does not establish that every surrounded rival territory is uncontested.

**How to apply:** Preserve the enclave's own colour and exclude its footprint from the surrounding territory's rendering and conflict calculations without rewriting saved borders.