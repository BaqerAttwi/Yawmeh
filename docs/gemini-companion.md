# Gemini character request understanding

The existing Sage/Nova/Pip character now has optional Gemini 3.1 Flash-Lite
request understanding. The avatar and voice controls remain the interface.
Gemini classifies a request and extracts a draft; server-owned code produces
the answer from the signed-in user's permitted records. No generated free-form
answer is displayed, and the AI route never writes task or money records.

## Enable

The local usage table has been created. On other installations, back up the
database and run `npm run db:init` after deploying this update. Configure:

```dotenv
GEMINI_API_KEY=your-private-google-api-key
COMPANION_AI_ENABLED=true
COMPANION_AI_DAILY_LIMIT=30
COMPANION_AI_MONTHLY_LIMIT=1000
```

Keep the key in the server environment, never in client/Vite variables. The
companion adapter pins `gemini-3.1-flash-lite` independently of the legacy
`GEMINI_MODEL` setting. Restart the server, open the character's settings and
enable **Understand requests with Gemini**. Each user opts in separately;
demo mode stays local. The UI explains what is sent before enabling it.

## Two layers

1. Gemini reads the current message, up to three recent user questions, the
   pending draft, selected dates, the current server date/timezone, and allowed
   app names. It receives no database records, balances, account email or user ID.
   Messages themselves may contain personal information the user chooses to type.
2. A strict JSON schema permits only known app intents and draft fields. The
   server checks app permissions, date ranges and configured currencies. It
   reads the authenticated user's snapshot and uses deterministic local logic
   for reports, calculations, planning suggestions and draft preparation.

Outside-app intents receive a fixed redirect. Unknown intents, extra fields,
truncated output and invalid values fail closed to the local fallback. The
model has no browser/search tools, database access or save/delete capability.
Drafts still open the existing confirmation form; only the user's Save action
calls the existing authenticated, validated mutation endpoints. Prompt-only
classification is imperfect, so the server's restricted output/actions are the
main boundary. Misunderstood drafts must still be reviewed.

Replies are limited to four nonempty lines/paragraphs and at most 900 characters
in this AI-assisted path. Detailed reports remain available in the relevant app.
Existing Arabic presentation preserves stored names, dates and amounts. No live
English/Lebanese/Arabizi accuracy claim is made until paid model tests are run.

## Cost and reliability

- 6 AI attempts/minute and 30/day per account; 1,000/month across the deployment.
  Environment settings can lower the daily/monthly caps, not raise these ceilings.
  Setting either cap to `0` disables paid calls. Invalid non-integer or negative
  values also disable calls instead of silently using the default allowance.
- Daily/monthly counters are persisted in MySQL using a transaction and row
  locks, so concurrent requests and restarts do not reset allowances. Counters
  contain scope, date and attempt count; prompts/replies are not stored there.
- Reservations happen before calling Google. Failed or disconnected attempts
  still count to prevent uncontrolled retries; no automatic paid retry occurs.
- The outgoing JSON body is at most 16,000 UTF-8 bytes. Gemini output is capped
  at 512 tokens with minimal thinking. Only one model call is made per attempt.
- The provider request times out after 12 seconds; the browser allows 15 seconds.
  Provider output is bounded to 32 KB and raw failures/keys are never returned.
  Provider redirects are refused so the custom API-key header cannot travel to
  a redirect destination. Natural speech requests also refuse redirects.
- Closing chat, restoring a conversation or starting a new chat cancels the
  request and discards late replies. Already-dispatched provider work may still
  be billable. Disabling AI also cancels pending work.
- Missing configuration, quota denial, bad provider output and outages use the
  existing local companion. The UI shows a fallback notice. Missing-field local
  draft followups avoid an additional paid call.

The request caps and token limits control exposure; they are **not an exact
dollar billing meter or a provider-enforced $10 budget**. The earlier $10 idea
remains a planning allowance. Monitor Google's billed usage and configure its
available account/project billing controls too. Actual cost includes token use,
any provider price changes, and separate speech services. No paid Gemini request
was sent during implementation because no API key was configured.

Existing chat-history behavior remains: recent chats are stored in this browser
and scoped to account/app permissions. AI opt-in is stored per browser/account.
Do not use a shared browser profile for private workspaces.

## Verification

`npm test` includes provider-stub HTTP tests for auth, cross-origin denial,
permissions, no-record disclosure, off-topic redirects, draft safety, quotas,
provider failures and malformed/oversized/truncated responses. Quota-store tests
cover transaction rollback and calendar-month rollover.

`tests/browser-companion-ai.mjs` uses a fake provider/test database to exercise
opt-in, draft review and explicit save, off-topic restriction, failure fallback,
late-reply cancellation and mobile/desktop layouts. It spends no API credits.
`tests/browser-audit.mjs` retains the broader layout/interaction checks.

Official references:

- [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite)
- [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Generation API](https://ai.google.dev/api/generate-content)
