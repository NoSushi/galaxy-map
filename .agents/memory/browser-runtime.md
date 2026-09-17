---
name: Browser test runtime
description: Chromium compatibility for local Playwright checks in this workspace.
---

Prefer the system-provided Chromium over Playwright's downloaded browser when running local browser checks.

**Why:** The bundled headless browser failed to launch because its shared libraries were unavailable; the system Chromium worked without changing dependencies.

**How to apply:** Discover the executable with `which chromium` and pass that path to Playwright's `executablePath`. Avoid broad searches through the Nix store for individual libraries.