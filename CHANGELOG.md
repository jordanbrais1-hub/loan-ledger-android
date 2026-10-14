# Changelog

All notable changes to Loan Ledger. Versions match `versionName` in
`android/app/build.gradle`; each release's APK is built with
`npm run android:apk` (see the [README](README.md#building-the-android-app)).
Installing a newer APK over an older one keeps all data on the phone.

## [Unreleased]

### Added
- **Public web demo** with no sign-in (`NEXT_PUBLIC_DEMO_MODE=true`), for
  people who want to try the app or contribute. Each visitor's data stays in
  their own browser. Shows a "Demo version" banner and a **Load example loans**
  button. Run it with `npm run demo`; build it with `npm run build:demo`.
- `vercel.json` to deploy the demo on Vercel (static export, security headers),
  with a preview deployment for every pull request.
- `CONTRIBUTING.md`, a pull request template and issue templates.

### Security
- The Android build refuses to run while the demo mode is on, so the
  no-sign-in mode can't end up in the app.

## [0.2.2] – 2026-10-14

### Added
- **Fixed % interest for one-time loans.** The rate can be a fixed % of the
  amount lent, charged once however long it takes to repay: ₡100,000 at 20%
  fixed = ₡120,000. Extra money lent on the same loan is charged the same %.
  Offered only for one-time repayment loans; switching to another plan resets
  the rate to monthly.
- The loan form previews it: "₡20,000 of interest, charged once: ₡120,000 to
  repay in total".

## [0.2.1] – 2026-10-14

### Added
- **Whole debt with interest.** Each loan's main figure is everything owed:
  principal plus the interest it carries.
  - Interest only: principal + this period's unpaid interest. ₡100,000 at 20%
    a month shows ₡120,000; after the ₡20,000 of interest is paid it shows
    ₡100,000, and the next month's interest is added once that month starts.
  - Installments: every installment left.
  - One-time: principal + interest up to the due date.
- **With interest / Without interest switch** on the loan page, dashboard,
  loans and people screens. It changes every total at once and is remembered.
- CSV export: new **Debt with interest** and **Debt without interest** columns.

### Changed
- The loan page leads with the whole debt; what's due now, overdue or next is
  shown underneath.
- Sorting loans by balance follows the chosen view.

## [0.2.0] – 2026-10-14

### Added
- **Repayment plans:** one-time repayment, **interest only** (the interest is
  due each period and paying only the interest rolls the loan over until the
  principal is repaid) and **installments** (amortized or flat interest).
- Monthly, twice-a-month (quincenal), every-2-weeks and weekly schedules, with
  a first payment date and an optional number of payments.
- Interest rates **per month** or **per year**.
- Optional **late fee** (fixed amount or % of what's late) after grace days,
  and full-period or prorated interest when a loan is paid off early.
- **Recording payments:** amount due, interest only, pay it all off, extra to
  principal (abono a capital) or any other amount; also lend more on the same
  loan, add a fee, or forgive part of the debt. Each payment shows how it was
  split.
- **Payment schedule** table for periodic loans.
- **Spanish (Costa Rica)** translation of the whole app, chosen from the menu
  under the profile picture, the sign-in screen or Account & backup; the first
  time, the app follows the phone's language. Money and dates are formatted for
  the chosen language (₡100 000,00 · 14 nov 2026).
- **Profile menu** on the profile picture: account, language, Account & backup,
  sign out.
- `npm test`: loan-engine tests and a check that every string has a Spanish
  translation (also part of `npm run check`).

### Changed
- New loan engine that replays each loan's history in date order.
- Database schema v3: existing loans become one-time loans with a yearly rate,
  so they keep working exactly as before. Older backups can still be restored.

## [0.1.1] – 2026-10-07

### Fixed
- Google sign-in on Android: no longer requests extra scopes, which the sign-in
  plugin rejects on Android.

## [0.1.0] – 2026-10-07

### Added
- First Android release: an offline app (Next.js static export packaged with
  Capacitor) that keeps the ledger on the phone.
- Google sign-in, with a separate on-device ledger per Google account.
- Dashboard, loans (lent and borrowed) and people screens; payments with
  simple yearly interest; search, filters and sorting.
- Loans in Costa Rican colones (₡) or US dollars ($), totalled separately.
- Backup and restore (JSON) and CSV export.

[0.2.2]: https://github.com/jordanbrais1-hub/loan-ledger-android/releases/tag/v0.2.2
[0.2.1]: https://github.com/jordanbrais1-hub/loan-ledger-android/releases/tag/v0.2.1
[0.2.0]: https://github.com/jordanbrais1-hub/loan-ledger-android/releases/tag/v0.2.0
