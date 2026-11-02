> Historical v1 notes. Custom currencies now supersede the USD/LBP-only scope; see [the current guide](custom-currencies.md).

# USD / LBP — v1

## Using it

- Settings → Current rate: enter Lebanese pounds per **1 USD**. This is a default for future entries, not a revaluation of history.
- Income, expense, opening savings, withdrawals and subscription payments have a Currency selector and Exchange rate input. The last successfully used currency is remembered per account. A selected recent purchase keeps its original currency; saved-item templates remain USD.
- The entry rate starts with Settings, but can be overridden for this entry. It is fixed when saved. Overriding it does not update Settings. Both raw amount and savings allocation are in the selected currency.
- Money, Dashboard, Today, Weekly review and History have their own report currency selector. Totals use individual snapshot rates and are labeled approximate. Separate USD/LBP totals remain visible. Weekly category charts follow that report selection. Budget comparisons stay explicitly in USD.
- Correct a saved entry with the existing reverse-and-recreate workflow; changing Settings never edits it.

## Boundaries

Only USD and LBP are accepted. Budgets, goal targets/reservations, saved item templates and subscription plans remain USD. Subscription payments may be recorded in either currency, with the actual amount paid. There is no automatic exchange between cash balances. Spending and withdrawals are validated against funds in that same currency. USD goal reservations do not consume LBP savings.

## Migration and history

`npm run db:init` adds entries.currency, entries.exchange_rate, users.current_rate and users.last_currency. Existing entries keep their original USD amounts and have a NULL historical rate because the old system never recorded one. A converted total requiring an unknown rate is shown as unavailable; native totals remain valid. Do not backfill historical rates using today's setting.

The migration was applied to local XAMPP on 2026-10-13 after creating a database backup. The fresh phpMyAdmin import and schema contract were updated too.

## Implementation and verification

Rates use DECIMAL(13,6), positive and at most 1,000,000 LBP/USD. Amounts retain their existing two-decimal representation. Converted reports round each entry/amount field to two display-currency decimal places, then sum; conversions never overwrite stored amounts. Settings writes and entry creation share the per-user ledger lock. Authenticated ownership and app permissions still apply. There is no endpoint that edits a saved snapshot.

89 regression tests passed; production build passed. Tests cover mixed totals, original amounts, unknown legacy rates, explicit rate overrides, changes to defaults, permission checks, separate-currency validation, reversal safeguards, USD goal reservations and subscription payments. Real MySQL verification confirmed storage and default-rate snapshots across settings changes. Browser checks covered Settings, LBP income/expense creation, remembered currency, report switching, saved-rate labels, payment forms and mobile overflow (375px, none). Sample rates used in tests are not live exchange-rate recommendations.
