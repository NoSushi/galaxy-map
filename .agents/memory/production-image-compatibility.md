---
name: Production image compatibility
description: External production CPU constraint behind the ImageMagick choice.
---
Keep image conversion compatible with the ImageMagick 6 `convert` CLI rather than reintroducing Sharp.

**Why:** On 2026-09-15 the user reported that the external production VM's old QEMU CPU profile prevents Sharp 0.35.4 from loading, while ImageMagick 6.9.12-98 has WebP support and successfully converted a PNG in their manual test. This was user-reported, not independently verified on that VM.

**How to apply:** Use IM6-compatible options. Workspace conversion tests may run against IM7; they do not establish compatibility with the exact production binary.