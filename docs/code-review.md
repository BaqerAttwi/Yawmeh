# Code review — 4 October 2026

Reviewed the React workflows, Express routes, authentication and permissions, financial calculations, task planning, reminders, AI adapters, and database schema/migration code. This is a code and automated-test review, not a completed production security or capacity audit.

## Changes made

- Isolated reminder failures: one failed delivery or user lookup no longer prevents processing the remaining reminders. Successful deliveries alone are recorded; failed deliveries can retry.
- Prevented overlapping client saves. When a save succeeds but refreshing fails, the app explains that it saved and requires a refresh before further changes. Uncertain network/server failures also require a refresh to reduce accidental duplicate entries.
- Added administrator-only **Settings → Setup & connections** and the read-only `node server/scripts/check-setup.js` command. They check required database tables/columns and report whether email and AI settings are present without exposing keys or sending messages.
- Improved malformed-request and AI connection/timeout error responses.
- Used a consistent date throughout closing the day, refreshed preset Today ranges after date rollover, and restricted date inputs to MySQL's supported DATE range.
- Reported demo-storage failures instead of allowing them to fail silently.

## Verification

- 59 automated tests passed, including new reminder failure, schema diagnostic, admin access, save/refresh failure, and date-validation tests.
- Production Vite build passed.
- Browser demo: custom range 2026-10-01 through 2026-10-07 applied correctly and updated task progress and spending. Settings rendered the new setup panel alongside existing preferences and account controls.
- Database check reached MySQL but authentication was rejected with the current `.env` credentials. Email and all three AI providers are unconfigured.
- Live MySQL workflows, real email delivery, paid AI calls, and multi-user load have not been verified. HTTP tests use an in-memory database test double.

## Next priorities

1. Correct `MYSQL_USER` and `MYSQL_PASSWORD` in `.env` to match XAMPP, then repeat the setup check and live workflow tests. Importing SQL does not configure the application's connection.
2. Add backup restoration with preview/validation; the app currently exports data but has no restore workflow.
3. Add self-service password changes and fuller editing of existing task, subscription, budget, and goal details.
4. Before public deployment, add durable request idempotency for financial writes, configure HTTPS/proxy-aware rate limits, and verify backup recovery.
5. Add pagination/incremental data loading and load tests before claiming a supported user count. The current data endpoint refreshes the full permitted account snapshot.
6. Unify frontend/server timezone configuration if deploying outside the default Asia/Beirut timezone.

No database schema change was introduced by this review; these fixes do not require reimporting the SQL file. Configuration presence is not proof that email or AI credentials work.
