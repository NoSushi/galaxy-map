---
name: Preview iframe session cookie
description: Session auth fails silently in the Replit preview iframe unless the cookie is SameSite=None + Secure.
---
The app's session cookie must be `sameSite: "none"` with `secure: "auto"` (behind `trust proxy`). With SameSite=Lax, browsers drop the cookie in the cross-site preview iframe: login *appears* to succeed (client trusts the login response body), but every later authenticated request 401s — presenting as "saves not persisting after refresh" while the session table shows valid sessions.

**Why:** the preview pane embeds the `.replit.dev` domain in a cross-site iframe; Lax cookies are not sent in that context. curl/localhost tests pass, which is misleading — always test auth via `https://$REPLIT_DEV_DOMAIN`.

**How to apply:** for any "logged out randomly / saves silently failing" report, check cookie SameSite first and verify with curl against the proxied HTTPS domain, not localhost. Sessions are stored in Postgres (connect-pg-simple, `session` table in the custom DB), so server restarts do not log users out.

Also: never PATCH real rows with test payloads without saving originals first — user data on Ventooine and Gorsh settlements was lost that way.
