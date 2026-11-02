# Daily-use update and review — 7 October 2026

Implemented setup guidance, recent-purchase drafts, remembered expense category, Today priorities/budget/payment summary, dismissible local suggestions, reversible task cancellation, overdue rescheduling, session listing and scoped remote sign-out, and last-successful-save time. Advanced task inputs are collapsed. Paid AI is removed from navigation, access checkboxes, setup messages and the active chat endpoint; legacy permission values remain readable for existing accounts. The local companion remains available.

## Verification

81 unit/integration tests pass, including cancellation isolation/restoration and cross-account session revocation. Production build passes. Browser demo verification covers the Today summary and simplified task form. Tests use a SQL-shaped test double; they do not prove live MySQL behavior or load capacity.

## Database upgrade

After XAMPP MySQL started, the migration completed and the setup check confirmed all required tables and columns are present. Restarted the old backend to load the new routes. Live HTTP checks against MySQL passed for login, session listing and remote revocation, task cancellation, exclusion from active snapshots, completion protection, and restoration. The temporary verification user and task were removed. The XAMPP fresh-import script also includes the new column.

## Security and performance

Session revocation requires authentication, validates its identifier, and scopes DELETE to the current user. Task cancellation is transactional, ownership checked, reversible, and does not create a recurring successor. Cancelled tasks are excluded from snapshots used by reminders and active reports. Cancelled tasks cannot be completed or rescheduled until restored. Existing JSON/origin protection, parameterized queries, rate limits, password hashing and session expiry remain in place.

Independent snapshot reads now run concurrently through the existing five-connection pool rather than serially. Recent-purchase and Today summary calculations are memoized. This reduces sequential work but is not a load-test result. Remaining scaling limits: full record snapshots after writes, unpaginated histories, and large illustration assets. Larger datasets should move to paginated histories and server-side aggregates, with measured database/query and browser timings before sizing hosting.

Dependency audit was attempted with `npm audit --omit=dev --json`; the npm advisory endpoint was unreachable. No clean dependency audit is claimed. HTTPS deployment, email delivery, real-device PWA installation and backup restoration remain separate checks.

