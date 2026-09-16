---
name: Planet sector text
description: User requires planet Sector to be independent free text, not a map-sector lookup.
---

Planet Sector must remain a plain text value without faction or polygon-sector lookup, suggestions, or existing-sector validation.

**Why:** The user explicitly rejected selecting existing map sectors; those represent political areas rather than the planet's descriptive sector.

**How to apply:** Keep planet Sector separate from political map membership. The legacy sectorId storage name is retained for compatibility, not as an instruction to resolve it to a sector record. Do not rewrite existing values without user approval.