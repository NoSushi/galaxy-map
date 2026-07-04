---
name: Absolute-positioned sibling overlapping a fixed/absolute header
description: Why an absolutely-positioned side panel's top controls (e.g. a close button) can render invisible/unclickable behind a top bar, even though the panel has a higher z-index than the main content.
---

When a layout has a top bar that is itself `position: absolute` (or `fixed`) and overlaid on the page (with sibling content given `padding-top` to visually clear it), any OTHER sibling that is also `position: absolute` with `top: 0` will NOT inherit that padding offset.

**Why:** The containing block for an absolutely-positioned element is the padding box of its nearest positioned ancestor. `top: 0` aligns to the outer edge of that padding box — i.e., the very top of the ancestor — regardless of the ancestor's own `padding-top`. Only normal-flow (non-absolute) children are pushed down by the ancestor's padding. This means a `top-0` side panel can visually start at the same y-coordinate as a top bar with a higher z-index, causing the top bar to render over the panel's own header/close button even though the panel's z-index is otherwise correct relative to other content.

**How to apply:** When a slide-in panel/sidebar sits alongside a fixed/absolute top bar, don't rely on `top-0` plus a z-index below the bar's z-index — either give the panel the same top offset as the in-flow content (e.g. `top-16` matching the bar's height) and reduce its height accordingly (`h-[calc(100%-Npx)]`), or nest it inside the already-padded flow container instead of using `top-0` directly. Check this whenever a user reports a button/element "hidden behind" or "under" another panel in an app with an absolutely-positioned top bar.
