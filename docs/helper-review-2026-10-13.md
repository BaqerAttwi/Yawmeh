# Helper and dependency review — 2026-10-13

- Added common typed Arabizi commands (sarfet, 2ebedt, zakerne, lyoum, bokra), retaining review-before-save behavior.
- Lebanese/Arabizi financial requests without a currency ask for one explicitly. Followups accept configured currency codes/names/symbols and remain permission scoped.
- Fixed Arabic numeral followups and replay of identical spoken responses; sending a new question stops microphone capture.
- Added accessible labels to voice controls and replaced the misleading Natural speed label with Normal. Device voices remain unchanged; no realistic Lebanese voice model was installed.
- Upgraded Nodemailer to ^10.1.0 (requires Node >=20). Applied compatible development dependency audit fixes.

Validation: 102 unit/integration tests pass, production build passes, npm audit reports zero known vulnerabilities after patches. Local email stream composition passed without sending email. Browser demo verified sarfet lyoum 20 → title → currency → review draft; no transaction saved.

Limits: This is a targeted review plus the existing regression/security suite, not a penetration test or load test. Arbitrary dialect phrases and Arabizi spellings are not universally understood. Detailed reports remain English. Real microphone recognition and live SMTP delivery require user/environment testing. The existing full-history snapshot architecture remains a scaling limitation.
