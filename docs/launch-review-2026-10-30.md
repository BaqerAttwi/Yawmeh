# Launch review — 30 October 2026

## Outcome

Application checks pass and deployment configuration is prepared. This machine
is still configured for local development, so the public site is not launched
or certified ready. The actual domain, HTTPS proxy, server credentials, SMTP and
off-server backup destination remain operator configuration.

## Changes

- Added explicit proxy trust using `TRUST_PROXY`. Default remains untrusted.
  Accepted settings are explicit IP addresses, non-zero CIDRs and loopback.
  Boolean trust, hop counts, wildcard ranges and malformed values are rejected.
  This fixes all visitors sharing one proxy-IP rate bucket when correctly
  configured behind Caddy/nginx. Multi-instance rate limiting still needs a
  shared store; the supplied deployment uses one process.
- Rejected ambiguous numeric record IDs before MySQL can coerce strings such as
  `12junk` to record 12. Includes subtask IDs and unsafe JavaScript integers.
  Existing ownership/permission checks remain in place.
- Malformed URL encoding now returns a client error rather than a misleading
  database service error.
- Production startup refuses insecure cookies, invalid HTTPS origins, short or
  placeholder database passwords, root database accounts, invalid timezones,
  missing frontend builds and invalid server ports.
- Added bounded graceful shutdown: stop reminder scheduling, wait for the active
  reminder job and HTTP requests, then close the database pool. Shutdown has a
  30-second deadline; systemd allows 35 seconds before forced termination.
- Added `npm run check:production` to check production settings, built frontend,
  schema, active administrator and SMTP configuration. Placeholder domains fail.
- Added `deploy/production.env.example`, a Caddy HTTPS proxy configuration and a
  restricted systemd service with automatic restart and a launch-check gate.
- Expanded browser verification to password recovery and login layouts, task
  dialog bounds, and 740px-high phone screens.

## Verification

- `npm test`: **131 passed, zero failed**. New HTTP checks exhaust one proxy
  visitor's bucket and confirm another visitor remains independent. Malformed
  IDs are rejected without database queries.
- `npm run build`: passed. Two non-fatal upstream Zod comment annotation warnings.
- `npm audit --json`: **zero known vulnerabilities** at review time.
- Edge browser audit: **95 recorded checks**, zero JavaScript page errors,
  overflow failures or out-of-viewport dialog/chat bounds. Widths: 320, 375,
  768, 1024 and 1440px. Phone height: 740px; other heights: 900px.
- Browser actions: create task, Arabic/English switch, add/check subtask,
  complete/reopen task, choose daily energy, capture note and companion reply.
- Read-only MySQL setup diagnostic: reachable and complete schema.
- `check:production` correctly refuses the current non-production environment.
- Startup/preflight files pass Node syntax checks.

No real user records, passwords, local environment settings or database schema
were changed by this review. Automated writes use test doubles and browser demo
data. Caddy and systemd are not available on this Windows machine; their
validation commands are included in the deployment guide and must be run on the
target Linux VPS. Linux signal shutdown behavior also needs its host smoke test.

## Remaining launch gates

1. Configure the real domain, production environment and HTTPS proxy; keep app
   and MySQL ports private and run under the dedicated service/database accounts.
2. Configure SMTP, verify actual reset/reminder delivery and email-domain DNS.
   SMTP is currently absent. Paid speech is optional and also unconfigured.
3. Take an encrypted off-server backup, restore into a separate database, and
   schedule/monitor backups. No retention/deletion or scheduler was installed.
4. Validate Caddy/systemd configuration, run `check:production`, and smoke-test
   live sign-in, permissions, save, logout, reset, restart and reboot.

See `../deploy/README.md` for the exact setup and validation sequence. This is a
code/deployment readiness review, not a penetration test or proof that every
possible interaction is free of defects.
