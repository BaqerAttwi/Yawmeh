# AI integration security review — 1 November 2026

## Findings and fixes

1. **Quota configuration bug:** `0` was treated as missing and silently restored
   the default allowance. Zero now disables AI. Invalid, negative, fractional,
   infinite or unsafe-integer values fail closed. Valid higher limits remain
   capped at 30/day/account and 1,000/month/deployment. Disabled configurations
   do not reserve counters or contact Google.
2. **Credential hardening:** Fetch followed upstream redirects by default. A
   custom `x-goog-api-key` header could otherwise be forwarded to a redirect
   destination. Gemini and natural-speech fetches now use `redirect: 'error'`.
   This is defense in depth for unexpected upstream behavior; there is no
   evidence of an actual key leak. An HTTP test serves a real 302 redirect and
   confirms the destination receives no request.
3. **Cancellation race:** Discard stale results immediately after decoding them,
   before altering UI status. The server also checks cancellation after quota
   reservation and before reading private records for a reply.

## Boundaries checked

- Authenticated requests only; app permissions and origin checks remain enforced.
- The provider URL/model are fixed server-side. User input cannot choose a URL,
  API key, database query, account ID, model or tool.
- Google receives user-written questions, recent questions, selected dates and
  pending-draft text, plus app permissions. Database snapshots, passwords,
  session cookies and the account email are not added to the provider prompt.
- Model results must match the strict intent/draft schema. Arbitrary answer
  fields, extra IDs and malformed/truncated/oversized responses are rejected.
- There is no model write tool. Drafts enter existing forms and must be saved by
  the user through the normal validated API. Reporting uses the authenticated
  user's scoped database snapshot and deterministic application calculations.
- React renders answer/title strings as text. There is no HTML evaluation of
  model responses in the character chat.
- Quotas are reserved transactionally before dispatch and persist across
  restarts. Failed paid attempts remain counted; there is no automatic retry.
- Provider errors and credentials are not returned to clients. API replies are
  marked no-store; the browser service worker does not cache private API data.

## Residual risks

AI adds an external service and billable endpoint. Text users choose to send can
contain private information even though database records are not attached.
The opt-in disclosure remains necessary; never type passwords or API keys into
the character chat. Review the provider's current data-use/retention settings
for the selected account before production use.

Prompt injection or ordinary misunderstanding can still cause an incorrect
allowed intent or draft. The server does not display unrestricted model prose
or allow direct saves, but users must review amounts, currencies and dates.
Outside-topic classification is not guaranteed; the restricted response/action
format is the stronger boundary. Local fallback is also a rule-based parser
and may misunderstand an unsupported request.

Request caps are not a dollar billing meter. A compromised allowed account can
consume its daily allowance and some of the shared monthly allowance. Separate
provider billing monitoring and production HTTPS, credentials, backups and
patching remain necessary. The app still uses in-memory minute limits; the
supplied deployment runs one instance, while daily/monthly AI caps use MySQL.

## Validation

- Full automated suite: **139 passed**, zero failures.
- Current dependency advisory audit: **zero known vulnerabilities**.
- Production build and Gemini browser regression checked after these changes.
- Integration tests include anonymous/ungranted/cross-origin denial, no-record
  disclosure, draft permission checks, injected extra fields, output bounds,
  provider failures, quota rollback and actual redirect refusal.

No live Gemini account was available, so model language accuracy and production
provider/account behavior remain unverified. Tests use simulated responses and
local HTTP servers; no paid model requests or real user record changes were made.
This code review does not establish an absence of all vulnerabilities.
