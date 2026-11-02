# Daywell

The existing administrator is the [Owner for family testing](docs/owner-family.md),
with account creation, app permissions and an owner-only usage dashboard.
Paid plans and payment collection are not enabled.

Optional [Gemini character request understanding](docs/gemini-companion.md)
adds bounded app-only interpretation, confirmed drafts and persistent usage caps.

For production deployment, follow [the VPS deployment guide](deploy/README.md).
It includes HTTPS proxy and systemd templates, startup validation, migration,
backup and launch checks. Run `npm run check:production` with your actual
production environment before launch; local development settings will fail it.

A private personal tracking app built with **React + Vite**, **Node.js + Express**, and **MySQL**. It includes a browser-local demo so you can try the interface before configuring services.

## Start the preview

Requires Node.js 22+.

```sh
npm install
npm run build
npm start
```

Open http://127.0.0.1:3001 to see the login page. Use **Try admin demo** to explore account management or **Try Tasks-only demo** to see restricted access. Demo accounts and sample records are browser-local previews. They cannot sign into the live API, send emails, or call AI providers.

For development, run `npm run dev` and open http://127.0.0.1:5173.

If your Windows npm shim is broken, run the npm CLI directly:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run build
node server/src/index.js
```

## Configure login and your first administrator

1. Copy `.env.example` to `.env`.
2. Configure your MySQL credentials and set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 12 characters. Replace the example password; the migration rejects placeholders.
3. Create an empty `daywell` database and a MySQL user with privileges on that database. Alternatively, with Docker installed, set `MYSQL_ROOT_PASSWORD` and run `docker compose up -d`. Wait for the database to become healthy.
4. Run `npm run db:init`. This creates the user/session tables and bootstraps the first administrator. Rerunning it does not reset an existing administrator’s password.
5. Run `npm run build` and restart the server with `npm start`.
6. Sign in with the administrator email and password. Open **Users & access** to create users.

**Upgrading an existing installation:** Back up the database, stop the old server, add the admin settings to `.env`, run `npm run db:init`, then restart. Existing records are assigned to the bootstrap administrator; newly created users start with empty private workspaces. The old shared `APP_PASSWORD` no longer grants access. The legacy settings table remains only to preserve migration information.

## Users and app access

- There is no public signup. Only the administrator can create users.
- Tick **Money**, **Tasks**, and/or **AI assistant**, or tick **All apps**. At least one app is required.
- Members cannot manage users or make themselves administrators. App permissions control both navigation and API access.
- Every user’s records, balance, task list and reminder email are separate. Admin user management does not provide access to members’ financial or task records.
- Use **Edit access** to change app permissions, disable a member, or optionally set a new password. Changes revoke their existing sessions. The administrator cannot disable their own account through this screen.
- Passwords are salted with scrypt. Session tokens are random, stored as hashes in MySQL, expire after 8 hours and use HttpOnly, SameSite=Strict cookies. Sign out revokes the session. No passwords or live session tokens are kept in local storage.
- AI summary sharing includes only the signed-in user’s data from apps they are permitted to access. Exports follow the same restriction.
- Disabled users do not receive reminders. Reminder jobs only read each user’s permitted apps and send to their own reminder address.

Keep `.env` out of source control. The app binds to localhost by default. For remote deployment, use HTTPS and set `COOKIE_SECURE=true`. Requests that mutate state must be JSON and same-origin. Live sign-in requires a reachable MySQL database; demo previews remain separate.

## Watch the demo

Click **Watch demo** directly beneath **Tasks** in the sidebar or on the Tasks page. The approximately 42-second animated walkthrough explains sign-in and access, adding tasks, email reminders, completion, income allocation and app switching. It includes pause/play, previous/next, direct scene selection and replay. Reduced-motion users start with autoplay paused. The walkthrough uses illustrative sample screens and never changes records; it is an in-app guided trailer, not a downloaded video file.

In the admin demo, create sample users and select **Preview access** to try the chosen permissions. **Back to admin demo** returns to user management access. Demo users are metadata-only previews and cannot authenticate against the live server.

## What you can do

- Record salary, freelance work and other income, with an amount allocated to savings.
- Add existing savings and inspect dated withdrawal reasons.
- Move money from savings to spending without counting the transfer as an expense. Record the actual purchase separately.
- Record one-time purchases and save reusable everyday items for quick purchase entry.
- Set spending limits over any date range, including multiple months. Budgets are independent views over the same expenses; overlapping budgets are not separate wallets.
- Track weekly, monthly and yearly subscriptions. **Record payment** logs the expense and advances the renewal date. Pausing stops reminders; it does not cancel the provider's subscription.
- Create tasks with categories, priorities, due dates and optional email reminder dates; mark them complete or reopen them. Suggested categories include Personal, Work, Learning, Health, Finance and Home, and you can type your own.
- Filter tasks by category, search and status. Click a task’s category chip to recategorize it. Category summaries show total, completed, remaining and completion percentage; Overview applies your selected due-date range.
- Filter dashboard summaries by Money / Tasks and date range; see budget and task donut charts, savings withdrawals, over-budget amounts and transaction history.
- Switch between apps from the nine-dot launcher.
- Chat with OpenAI, Claude or Gemini with optional summary sharing.
- Export the current workspace as JSON from Settings. This export is for inspection/backups; there is no import feature yet.

All amounts are USD. Money calculations use integer cents and MySQL DECIMAL columns. Transactions are append-only in this version to preserve the audit trail. Existing items, budgets and most task details are not editable yet; tasks can be completed/reopened or recategorized, and subscriptions paused/resumed. Run `npm run db:init` after upgrading to add the task category column. Existing tasks default to Personal without changing their other fields.

## Planning, goals and reviews

- **Tasks:** choose daily or weekly repetition when creating a task, or change it under **Subtasks & repeat**. Completing an occurrence preserves its history and creates one next occurrence, skipping missed dates. Choose **Does not repeat** on the pending occurrence to stop. Completed occurrences with a successor cannot be reopened.
- **Subtasks:** add up to 30 steps when creating a task or inside its details. Finish the checklist before completing its parent. Each recurring occurrence starts with an unchecked copy of the checklist.
- **Money → Goals:** set a target amount and optional date, assign existing savings, and review dated funding/release history. Reservations do not create income or expenses. Release reserved savings before withdrawing them to spending.
- **Overview → Weekly review:** review income, purchases, savings withdrawals, task completion by category, and renewal dates for any week. Task counts use due dates and current completion status; this is a live review, not a frozen historical snapshot.
- **Overview → Calendar:** see tasks and subscription renewals together. Dashed events are forecasts; recurring tasks become actual records after the previous occurrence is completed. Paused subscriptions are excluded.

These features sit inside the existing apps without adding sidebar entries. Money and Tasks permissions apply to all new records and views.

After upgrading, run `npm run db:init` with MySQL available to add recurrence fields, subtasks, goals and goal movement tables. The migration preserves existing records. Automated HTTP tests use an in-memory test store; the live MySQL migration requires verification against your database.

## Email reminder configuration

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, and (if required) `SMTP_USER` / `SMTP_PASSWORD`. Set your destination email in the app's Settings. Use `SMTP_SECURE=true` for implicit TLS on port 465; port 587 normally uses `false` with STARTTLS.

The server checks every minute using `TIMEZONE` (default `Asia/Beirut`):

- Subscription notice: three days before renewal, with a two-day catch-up window.
- Urgent notice: one day before renewal, with a due-day catch-up window.
- Task email: on the selected reminder date; missed reminders are delivered on restart unless the task is completed.

The server must stay running and connected to MySQL and SMTP. Reminders use date granularity, not a scheduled hour. A MySQL advisory lock prevents concurrent workers from sending the same reminder, and successful sends are logged uniquely. Failed sends are retried. A crash between SMTP acceptance and logging can cause a duplicate; SMTP does not support exactly-once delivery. Renewals already in the past are shown as overdue in the app, but expired subscription email notices are not sent retroactively.

## AI assistant

Set at least one server-side API key:

| Provider | Key | Optional model override |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| Claude | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` |

Model names are configurable; use a model available to your provider account. API credentials and billing are separate from consumer chat subscriptions. Keys never go to the browser. Each request sends the conversation to the selected provider. Budget balances, budget periods and task details are included only if the explicit sharing checkbox is selected. Changing providers starts a fresh conversation and resets consent. Chat is held in page memory, not stored in MySQL. AI cannot change your records.

Adapters follow the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Claude Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages), and [Gemini GenerateContent API](https://ai.google.dev/api/generate-content).

## Verification

```sh
npm test
npm run build
```

Tests cover money allocation, savings/expense guards, period boundaries, leap-year renewals, date and amount validation, reminder tiers, AI adapters, password hashing, session expiry/logout, admin-only account creation, permissions, cross-user access, session revocation and cross-origin rejection. HTTP authorization tests run against a test store; the live database migration still requires MySQL. Live MySQL, SMTP delivery and paid AI responses require your services and credentials.

## Structure

- `client/src/app/`: application composition and workspace state.
- `client/src/features/`: React features grouped by purpose (Today, tasks, planning, auth, AI, and settings).
- `client/src/components/`, `lib/`, and `styles/`: reusable UI, client utilities, and styles.
- `server/src/app.js`: Express app factory; `server/src/index.js`: HTTP server and reminder startup.
- `server/src/modules/`: backend modules grouped by responsibility.
- `server/src/database/`: MySQL connection/snapshot and schema contract.
- `server/scripts/`: database migration and setup diagnostics.
- `shared/`: integer-cent accounting, date helpers and shared input validation.
- `tests/unit/`, `tests/integration/`, and `tests/helpers/`: pure-logic tests, integration tests, and test doubles.
- `database/`: phpMyAdmin SQL import and installation instructions.
- `docs/`: architecture notes, code review, and screenshots.
- `compose.yaml`: optional local MySQL service with a persistent volume.

See [Architecture](docs/architecture.md) for boundaries and commands. Keep running commands from the project root so `.env` is loaded consistently.

See [Security review](docs/security-review.md) for protections, verification limits, and HTTPS deployment settings. Production startup now requires `COOKIE_SECURE=true` and an HTTPS `APP_ORIGIN` when `NODE_ENV=production`.

## Daily tools and corrections

- Overview → Daily check-in combines today's spending, task completion ring, estimated remaining minutes, and a Plan tomorrow action.
- Active budgets show in-app notices at 80% and 100%. These notices are not email or push alerts.
- Money → Goals includes a monthly contribution forecast. Plans do not automatically transfer money.
- Tasks accept 0–1440 estimated minutes; estimates carry over to recurring occurrences.
- Money → Subscriptions shows annualized costs and a manual rarely-used flag. Weekly estimates use 52 payments per year.
- Overview → History searches transactions and completed tasks by type, date, category and text. Undo preserves the transaction with a correction date and reason, excludes it from calculations, and protects spending and reserved savings. It does not rewind a subscription renewal date. Enter a replacement transaction separately when needed.
- Charts include text labels; entrance and progress animations respect reduced-motion preferences.

Run `npm run db:init` after this upgrade for the additional columns. Live migration still needs a configured MySQL service. The production build and 41 automated tests pass; HTTP tests use the in-memory database test double.

## A calmer daily plan

Open **Overview → Daily check-in**. No new main navigation items were added.

- **Top 3:** select up to three tasks for today. Selections, completion charts and energy are stored per day. Tomorrow begins with a fresh selection.
- **Energy:** low, normal and high provide adjustable planning suggestions, not requirements. The workload chart uses estimates on unfinished priorities and identifies tasks without estimates.
- **Quick inbox:** capture a thought, expand Organize your inbox to convert it to a dated task, or archive it. Archived notes can be restored. Conversion preserves the note and creates a task only once, including simultaneous requests.
- **Focus mode:** choose a task and work through its next unfinished subtask. Start, pause or reset an optional timer. The timer ends when the dialog closes and never completes a task automatically.
- **Reschedule:** move a pending task to tomorrow or another date from Daily check-in or task details. Email reminders shift with it. Recurrence continues from the new due date; completed tasks must be reopened first.
- **Personal time:** add Rest, Hobbies or People activities with a date, optional start time and duration. They appear in Tasks, Calendar and category summaries like other tasks.
- **Reflection:** save what went well and what would help tomorrow; choose an earlier date to revisit or edit it. Reflections and unconverted inbox notes are not included in AI summary sharing. They are included in your account export.
- **Quiet hours:** Settings accepts an email-reminder start and end time, including overnight ranges. Uses the server timezone, default Asia/Beirut. Leave both blank to disable. Existing reminder catch-up windows still apply; the server and SMTP must be available. Quiet hours do not control in-app budget notices.

Daily tools require Tasks access. All reads and writes are scoped to the signed-in user, including admin accounts' personal records. Energy, notes and priorities save to MySQL in live mode and local demo storage in demo mode. Run `npm run db:init` to add the new tables and columns before live use. The migration has not been exercised against a live MySQL server in this environment.

## Today and closing the day

### Companion avatars and loading improvements

Companion chat also prepares drafts. Examples: `add a task called football at 9 pm tomorrow`, `add expense 15 for lunch`, and `add income 700 from work`. Press **Review draft**, check the normal form, and save. Quick Add offers task, expense, income, existing savings, withdrawal, budget, subscription, and frequent-item forms according to account permissions. Commands use a local parser, not a general-purpose AI: unclear commands get guidance; they do not silently mutate records. Sage, Nova and Pip now use animated anime-inspired chibi designs, retaining motion controls and reduced-motion support.

The latest companion UI is a small animated character in the bottom corner on all workspace pages. Click it to open a local report chat. Ask about savings, spending, or plans, use Today / weekly / monthly wording, enter ISO dates such as `report 2026-10-01 to 2026-10-04`, or select From/Through dates. Character selection and motion controls are inside the chat. It replaces the large Today companion card. Answers use recorded data and account permissions; this is a limited report interpreter, while open-ended AI advice remains in AI assistant. Chat history lasts only for the current signed-in page session (up to 20 exchanges).

Today includes three selectable companions: Sage, Nova, and Pip. Their Today / This week snapshots show permitted task progress, remaining estimated time, expenses, savings balance, and planned monthly goal contributions. These are calculations from your records, not AI-generated advice, and require no provider key. The selected avatar is stored per account and demo/live mode in this browser; it does not sync across devices. Weekly task counts use due dates and Monday–Sunday boundaries. Goal plans are not automatic transfers.

The workspace now loads after authentication, reducing initial JavaScript from approximately 430 kB to 235 kB before compression (124 kB to 73 kB gzip). The remaining workspace chunk loads when needed. Task rows reuse an index of subtasks and recurring children rather than scanning the entire lists for each row. Balances and period summaries are memoized. These are bundle and algorithm improvements; no real-world latency or multi-user capacity claim has been measured.

### Setup diagnostics and reliability review

Administrators can open **Settings → Setup & connections** to inspect database schema readiness and email/AI configuration. If login is unavailable, run `node server/scripts/check-setup.js` from the project folder. This read-only command does not send email or call AI services. See [code review](docs/code-review.md) for the latest fixes, verification, setup blockers, and recommended next steps. The review passed 59 automated tests and a production build; live MySQL integration still requires valid connection credentials.

Overview opens on Today. Choose Today, 2 days, 3 days, Week (seven days starting today), or an inclusive custom range of up to 366 days. Task progress, estimates, recorded spending and renewals follow this range. Top 3 and Done for today always refer to the current day. Additional daily tools stay collapsed below the main view.

Done for today reviews completed tasks, lets you select unfinished tasks due today or earlier to move to a later date, and saves your reflection. Unselected tasks retain their dates; tasks are never automatically completed. Saving is atomic and repeated submissions do not move tasks twice. Reopen today preserves reflections and moved dates. The new day_plans.closed_at column requires npm run db:init once MySQL credentials are configured.

### Companion chat and bilingual voice

The companion opens a conversation-first panel with three rotating suggestions, separate Quick add and Date range tools, and a composer that stays visible as replies grow. Reports display recorded balances and period totals as cards. Draft cards show the original title, amount, date, and time; Review & save opens the existing form, and Dismiss clears the draft without saving.

Choose English, عربي, or Auto for the chat language. Auto follows the language of typed questions (including supported Arabizi); numeric followups retain the previous language. Arabic mode supports right-to-left layouts and localized reports, priorities, budgets, subscriptions, goals, affordability, spending comparisons and savings suggestions. Task and money review forms have an English/Arabic switch and follow the chat language when opened from a draft. Unrecognized response templates retain their source text with a visible note.

The Speak button and Voice on/off toggle sit above the message input. Voice settings contain independent English/Arabic voice choices, previews, microphone language, speed, and replay. Speech follows the reply text. In Auto microphone mode, recognition follows the current chat language; use voice settings to explicitly switch recognition languages. Language, character, motion, reading preference, voice choices, and speed are remembered per account and demo/live mode in this browser. Closing the panel stops microphone capture and speech. Preparing, listening, and speaking have visible state labels; motion respects the pause setting and reduced motion.

Voices depend on the device; a Lebanese accent is not guaranteed. Install an Arabic speech voice in device settings if none is available. An optional natural voice service is available in live mode after server configuration and explicit selection in voice settings. Browser speech may be processed online; Yawmeh does not store audio.

### Recent chats and optional natural voice

Recent chats preserve the latest five conversations and unfinished drafts for up to 30 days in this browser, scoped to account and demo/live mode. Cancelling a review form leaves its draft available; confirming a save clears the draft action. Use Recent chats to reopen or delete a conversation.

For optional natural English/Arabic speech, configure `OPENAI_API_KEY` and `COMPANION_VOICE_ENABLED=true` on the server, restart it, and choose Natural voice in the live workspace voice settings. This is paid OpenAI API usage and sends the played reply text to OpenAI. Device voices remain the default. See [continuity, Arabic and voice setup](docs/companion-continuity-and-voice.md) for limits and validation details.
