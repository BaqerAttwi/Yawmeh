# Custom currencies and home currency

Users with Money access can open Settings → Your currencies and:

1. Add a name, a symbol, or both. For example `Euro`, `€`, or `Euro (€)`.
2. Enter a rate against USD or their configured home currency. The form spells out the direction: **1 reference currency = N new currency units**.
3. Choose a home currency and save. New accounts default to USD. Report views initially use the home currency and can still be switched independently.
4. Change default rates later. Entry forms remember the last-used transaction currency and allow a transaction-specific rate.

Rates are manually supplied by the user. Sample values in tests/demo are illustrations, not current market rates. Up to 20 custom currencies are supported in addition to USD/LBP. Currency identifiers/labels are fixed after creation so recorded entries keep a stable identity; default rates and home currency can change. Currency deletion and renaming are not included.

## Accounting behavior

Amounts and savings allocations remain in the original transaction currency. Entries save a complete map of configured rates and labels at creation, using USD as the internal reference. Conversion from source to report currency divides by the source snapshot rate and multiplies by the target snapshot rate. Each converted field is rounded to two display decimals before aggregation. Approximate combined totals and exact native-currency totals are displayed together. Changing the home currency changes display only.

Historical records never use current settings rates. An older record with no rate for a newly added target currency makes the affected combined total unavailable; native amounts are still shown. Earlier USD/LBP records retain their original `exchange_rate` convention. New entries are identified by `rate_snapshot`, and their `exchange_rate` stores source units per USD. No migration rewrites raw amounts or historical rates.

Funds cannot be silently exchanged: expenses, savings withdrawals and reversals validate each native balance. USD goal reservations remain USD-only. Budgets, goal targets, saved item templates and subscription plan prices remain explicitly USD. Actual subscription payments can use any configured currency. No real money transfers or FX trades are performed.

## Storage and safety

Additive migration: users.custom_currencies JSON, users.home_currency (USD default), entries.rate_snapshot JSON; entries.currency and users.last_currency widened to VARCHAR(40). The fresh phpMyAdmin SQL and schema contract match. Rates are bounded positive decimals with six fractional digits. A per-user transaction lock serializes currency/rate/home updates and entry creation. Unsupported currencies, invalid rates, duplicate names and reserved object keys are rejected. Custom currencies belong only to their owning account; endpoints require Money access. Client-supplied snapshot maps are discarded in favor of server capture.

## Verification — 2026-10-13

95 unit/integration tests passed, production build passed, schema check passed. Live MySQL/API checks with a temporary account verified symbols, home-currency persistence, native amounts, immutable snapshots after a rate change, and unavailable conversion into a later-added currency. Temporary live records were deleted. Browser demo checked adding Euro with its symbol, selecting it as home, the report default, transaction entry and saved formatting, and 375px mobile overflow (none). Backed up MySQL before migration; the local backend was restarted.
