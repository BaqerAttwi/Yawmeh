# Owner account and family testing

Your existing administrator is the application **Owner**. Its internal role
remains `admin` for compatibility with the existing permission/session system.
No new owner password is generated or printed. The configured local database
has one active owner account; its credentials were left unchanged.

Sign in with that account and open **Users & access**. The page now renders the
previously disconnected account manager, plus an owner dashboard.

## Family testing

- The dashboard is labeled **Family testing** and **Payments not enabled**.
- Only the owner creates accounts, chooses Money/Tasks access, disables members
  and optionally resets their passwords. Public signup is still unavailable.
- Newly created accounts are ordinary members, not owners. The API rejects
  attempts to add `role`, `plan` or payment fields to the creation request.
- Family members retain separate private workspaces. This update does not
  introduce shared financial records, shared tasks, family groups or billing.
- Paid plans remain future work. No checkout, charge, entitlement purchase or
  fake payment state was added. These test accounts require no payment.

## Usage visibility

The owner-only `/api/admin/usage` endpoint reports total/enabled accounts,
distinct enabled accounts with recent authenticated activity (last 5 minutes
and last 7 days), successful sign-in count, and deployment-wide Gemini attempts
for the current month. Account details show last activity, last sign-in and
sign-in count. Refresh usage manually for updated values.

Activity is approximate request activity, including authenticated background
session checks. It is not an exact concurrent-user counter or anonymous visitor
analytics. Multiple devices for one account count as one recently active account.
Disabled accounts remain in totals but are excluded from active counts.

Tracking starts when this update is installed: old sign-ins and activity are not
reconstructed. New fields contain UTC timestamps; the UI displays local time.
Sign-ins are counted atomically with successful session creation. Activity writes
are limited to once per minute per account by a database condition. Failure of
activity-only tracking does not prevent an otherwise valid session from working.

The dashboard reads account metadata and aggregate AI attempt counts. It does
not read members' transactions, task contents, chat text, password hashes or
session tokens. Existing record-owner restrictions remain enforced independently
of the owner's account-management privilege.

## Deployment and credentials

The local tracking columns have been added without changing records or passwords.
On another installation, back up the database and run `npm run db:init` before
starting the new server. It adds `last_seen_at`, `last_login_at` and `login_count`
to `users`. The schema contract and SQL export include these fields.

For a fresh installation, configure `ADMIN_NAME`, `ADMIN_EMAIL` and a unique
`ADMIN_PASSWORD` directly in the server environment, then run `npm run db:init`.
An existing owner is preserved; changing bootstrap variables does not reset its
password. Use Settings → Change password or the existing recovery process when
needed. Never paste passwords into chat or commit them to source control.

## Verification

- Full automated suite: **142 passed**.
- Owner tests cover anonymous/member denial, family account creation, rejected
  role/plan escalation, owner protection, metadata-only reporting and atomic
  sign-in tracking.
- Phone/desktop UI test creates and disables test family members, checks owner
  counts and confirms member navigation/API denial using an in-memory database.
- Broader responsive audit covers the owner page at 320, 375, 768, 1024 and
  1440px widths. No real family accounts were created by automated tests.
