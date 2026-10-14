# Loan Ledger

A simple, friendly app that replaces the notebook where you write down money
you lend and borrow. It is an **offline Android app**: every record is stored on
the phone, nothing is sent to a server, and you sign in with Google so each
person gets their own private ledger.

Loans can be in **Costa Rican colones (₡ CRC)** or **US dollars ($ USD)**, and
can be one-time loans, **monthly interest-only loans** that roll over each
month, or **installment loans**. The app is available in **English and
Spanish**.

> Built with **Next.js 16 (App Router, static export)**, **React 19 +
> TypeScript**, **Tailwind CSS 4**, **Dexie (IndexedDB)**, **Zod** and
> **Capacitor 8**.

What's new in each version: see the [changelog](CHANGELOG.md). Want to help?
Try the [public web demo](#public-web-demo) and read [CONTRIBUTING.md](CONTRIBUTING.md).

> [!IMPORTANT]
> This repository contains **no credentials**. To run or build it you must
> create your **own** Google OAuth clients, your **own** `.env.local` and your
> **own** Android signing key. See [Security and configuration](#security-and-configuration).

---

## Table of contents

1. [Features](#features)
2. [How it works](#how-it-works)
3. [Repayment plans and payments](#repayment-plans-and-payments)
4. [How the money math works](#how-the-money-math-works)
5. [Languages](#languages)
6. [Public web demo](#public-web-demo)
7. [Security and configuration](#security-and-configuration)
8. [Getting started (development)](#getting-started-development)
9. [Configuration](#configuration)
10. [Google sign-in setup](#google-sign-in-setup)
11. [Building the Android app](#building-the-android-app)
12. [Releasing a new version](#releasing-a-new-version)
13. [Backups and moving to a new phone](#backups-and-moving-to-a-new-phone)
14. [Project structure](#project-structure)
15. [Data model](#data-model)
16. [Scripts](#scripts)
17. [Troubleshooting](#troubleshooting)
18. [Privacy and security](#privacy-and-security)
19. [Guía rápida en español](#guía-rápida-en-español)
20. [License](#license)

---

## Features

| Area | What you get |
| ---- | ------------ |
| **Dashboard** | How much you're owed, how much you owe, your net position, the number of open loans, loans that are overdue or due within 7 days, and recent payments. |
| **Loans** | Add, edit and delete loans in either direction ("I lent money" / "I borrowed money"), with currency, amount, date, interest rate, purpose and notes. |
| **Repayment plans** | **One-time repayment** (optional due date), **Interest only** (pay the interest each period; the loan rolls over until the principal is repaid) or **Installments** (equal payments of interest + principal). See [Repayment plans and payments](#repayment-plans-and-payments). |
| **Flexible schedules** | Monthly, twice a month (quincenal: e.g. the 15th and 30th), every 2 weeks or weekly; a chosen first payment date; a fixed number of payments or open-ended. |
| **Interest rates** | Quoted **per month** (common for personal loans), **per year**, or, for one-time loans, a **fixed %** charged once (e.g. 20% → ₡100,000 becomes ₡120,000, however long it takes). Installment interest on the remaining balance (amortized) or on the original amount (flat). |
| **Late fees and early payoff** | Optional late fee (fixed amount or % of what's late) after a number of grace days; choose whether paying off early charges the whole period's interest or only the days used. |
| **Recording payments** | One tap for the amount due, **interest only**, **pay it all off**, **extra to principal** (abono a capital) or any other amount. Also **lend more** on the same loan, add a **fee**, or **forgive** part of the debt. Every payment shows how it was split. |
| **Payment schedule** | For periodic loans: each due date with its interest, principal, fees, total and status (paid, part paid, overdue, due, upcoming). |
| **Two currencies** | Each loan is in colones (₡) or dollars ($). Totals are kept **separately per currency**; the app never converts between them. |
| **Whole debt, with or without interest** | Each loan shows everything owed as one figure: principal + the interest it carries (e.g. ₡100,000 at 20% a month shows **₡120,000**). A **With interest / Without interest** switch changes every total in the app to principal only, and is remembered. |
| **Automatic math** | What's due now, the next payment, principal left, interest so far, payoff amount, % repaid and status (**Active**, **Overdue**, **Paid off**). |
| **English and Spanish** | Switch language from the menu under your profile picture (or on the sign-in screen). The first time, the app follows the phone's language. |
| **Search and filters** | Search by name, purpose or notes; filter by status and direction; sort by date, due date or balance. |
| **People** | Everyone you deal with and where you stand with each. A person is created the first time you type their name on a loan. Store a phone, email and notes for each. |
| **Google sign-in** | Needs a connection once; afterwards the app opens offline. Each Google account gets its own separate ledger on the device. |
| **Backup and restore** | Save the whole ledger as a JSON file (to Drive, email, Files…) and restore it on another phone. |
| **CSV export** | Every loan with its current balance, ready for Excel or Google Sheets. |
| **Looks** | Works on phones and desktops, with automatic light/dark mode. |

---

## How it works

```
┌──────────────────────────── Android phone ────────────────────────────┐
│                                                                       │
│  Capacitor app (WebView)                                              │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Static Next.js app (HTML/JS built into out/)                    │  │
│  │                                                                 │  │
│  │  pages (src/app) ──► queries.ts / actions.ts ──► Dexie          │  │
│  │                         │                         │             │  │
│  │                    loan-math.ts               IndexedDB         │  │
│  │                  (balances, interest)   "loan-ledger-<googleId>"│  │
│  └─────────────────────────────────────────────────────────────────┘  │
│        │ sign-in only                                                 │
└────────┼──────────────────────────────────────────────────────────────┘
         ▼
   Google accounts (needed once per account, to confirm who you are)
```

- **No server.** `next build` produces a fully static app (`output: "export"`)
  that Capacitor packages into the APK. All reads and writes go to IndexedDB on
  the device through Dexie.
- **One database per account.** After sign-in, the app opens the database named
  `loan-ledger-<Google user id>`. Two people sharing a phone never see each
  other's loans.
- **Live screens.** Pages read data with `useLiveQuery`, so they update by
  themselves after a change. There is no manual refresh.
- **Routes with query strings.** A static export can't have dynamic routes like
  `/loans/[id]`, so records are addressed as `/loans/view?id=12`
  (see `src/lib/routes.ts`).

---

## Repayment plans and payments

When you create a loan, pick how it will be repaid:

| Plan | How it works | Typical use |
| ---- | ------------ | ----------- |
| **One-time repayment** | Interest builds up day by day, or is a **fixed %** of the amount lent charged once; they repay whenever they can (all at once or bit by bit), optionally by a due date. | Informal loans between family and friends; "I lend you ₡100,000 at 20%, you return ₡120,000". |
| **Interest only** | Each period (e.g. each month) the interest is due. Paying **only the interest** rolls the loan over to the next period; the principal is repaid whenever they can, or with the last payment if you set a number of payments. | "I lend you ₡100,000 at 10% a month: pay me ₡10,000 every month until you return the ₡100,000." |
| **Installments** | A fixed number of equal payments that cover interest and principal (French amortization), or flat interest on the original amount. | Loans repaid in cuotas over a set time. |

Periodic plans (interest only and installments) can be **monthly**, **twice a
month** (the start day and 15 days later, e.g. the 15th and the 30th), **every
2 weeks** or **weekly**. The first payment defaults to one period after the
loan date, and can be changed.

**More options** (per loan):
- **Late fee (mora):** none, a fixed amount, or a % of what's late. It's charged
  once for each payment still unpaid after the **grace days**.
- **If they pay it all off early:** charge the whole period's interest, or only
  the days used (prorated).

**On the loan page, under Record:**

| Tab | Option | What it does |
| --- | ------ | ------------ |
| Payment | **Amount due / Installment due** | Covers everything due now (including overdue periods and fees). |
| Payment | **Next payment** | Paying ahead of time: the money is kept as credit and used on the next due date. |
| Payment | **Interest only** | Pays only the interest. The principal stays owed and the loan continues to the next period. |
| Payment | **Pay it all off** | Pays everything owed today and closes the loan. |
| Payment | **Extra to principal** | Abono a capital: goes straight to the principal, so future interest goes down. |
| Payment | **Other amount** | Pays what's due first; anything extra is kept for the next payment and the rest lowers the principal. |
| Lend more | | Adds to the principal of the same loan (not for installment loans). |
| Fee | | Adds an extra charge by hand, due right away. |
| Forgive | | Cancels part of the debt without a payment: fees first, then interest, then principal. |

Each record in the **History** shows how it was applied, for example
`₡10,000.00 interest + ₡5,000.00 principal`. Removing a record recalculates
everything.

---

## How the money math works

All of it lives in `src/lib/loan-math.ts`, and `src/lib/loan-math.test.ts`
checks it (`npm test`).

- The loan is worked out by **replaying its history in date order**: the money
  lent, each payment, fee, extra amount lent and amount forgiven.
- Interest is **simple** (it doesn't compound) and builds up **day by day** on
  the principal still owed. A rate per year is first turned into a monthly rate
  (÷ 12).
- **One-time loans:** interest per day = monthly rate × 12 / 365. Everything is
  due on the due date.
- **Fixed % (one-time loans only):** the % of the amount lent is charged once,
  on the loan date (and on any extra amount lent, when it's lent). It doesn't
  grow with time; payments cover it first.
- **Periodic loans:** each period's interest is charged on its due date. The
  rate per period is the monthly rate × 12 / periods per year (12 monthly, 24
  twice a month, 26 every 2 weeks, 52 weekly). A first period that's longer or
  shorter than normal is charged in proportion to its days.
- **Installments** use the standard amortization formula
  `P × r / (1 − (1 + r)^−n)`, or, for flat interest, `P / n + P × r` each
  period.
- **Payments clear the oldest charges first:** fees, then interest, then
  principal that is due. Money paid before anything is due is held as
  **credit** for the next charge; anything beyond the next charge lowers the
  principal. If a payment covers everything owed, the loan is paid off.
- **Interest only** payments only touch interest; **extra to principal** only
  touches principal.
- **Late fees** are charged once per period that's still unpaid
  `grace days` after its due date.
- A loan is **Overdue** when something past its due date is still unpaid.
- Once a loan is fully repaid, no more interest is added. Set the rate to **0**
  for an interest-free loan.
- Totals (dashboard, loan list, people) are **summed per currency**. If you have
  loans in both currencies you'll see two figures, for example
  `₡150,000.00` and `-$200.00`.

**Example (interest only):** you lend ₡100,000 at **10% per month** on
14 October, with monthly payments. On 14 November ₡10,000 of interest is due.
If they pay ₡10,000 with **Interest only**, the loan rolls over: they still owe
₡100,000 and the next ₡10,000 is due on 14 December. If they also pay ₡20,000
with **Extra to principal**, the principal drops to ₡80,000 and the next
month's interest to ₡8,000.

**Whole debt (with interest):** the big number on each loan, and the totals on
the dashboard, loans and people screens, count the interest the loan carries:

| Plan | With interest | Without interest |
| ---- | ------------- | ---------------- |
| Interest only | Principal + this period's unpaid interest (+ any overdue interest and fees) | Principal (+ fees) |
| Installments | Every installment left (principal + interest) | Principal (+ fees) |
| One-time | Principal + interest up to the due date (or so far, with no due date); with a fixed %, principal + that interest | Principal (+ fees) |

So ₡100,000 at 20% a month shows ₡120,000. When they pay the ₡20,000 of
interest it shows ₡100,000 again, and the next month's ₡20,000 is added the day
after its period starts. Money paid in advance is subtracted.

**Example (one-time):** you lend ₡100,000 at 12% per year on 1 January. After 31
days the interest is 100,000 × 0.01 × 12 / 365 × 31 ≈ ₡1,019.18. If they pay
₡20,000 that day, ₡1,019.18 covers the interest and ₡18,980.82 reduces the
principal to ₡81,019.18.

---

## Languages

The app is written in English with a full Spanish (Costa Rica) translation.

- **Switching:** tap your **profile picture** (top right) → **Language /
  Idioma**, or use the switch on the sign-in screen or in **Account & backup**.
  The choice is saved on the phone. The first time, the app uses Spanish if the
  phone is set to Spanish.
- **Formatting follows the language:** in Spanish, amounts and dates look like
  `₡100 000,00` and `14 nov 2026`.
- **How it works:** every piece of text goes through `t("English text")` from
  `src/lib/i18n.ts`, with `{placeholders}` for values:
  `t("Due in {n} days", { n })`. `src/lib/i18n-es.ts` maps each English string
  to Spanish. Missing translations fall back to English.
- **Adding or changing text:** write the English inside `t("…")` (always a
  plain string literal), then add the Spanish to `i18n-es.ts`. `npm test` fails
  if any string is missing a translation, if a translation is no longer used, or
  if it uses a placeholder the English doesn't have.
- **Adding a language:** add it to `LOCALES`, `localeNames`, `dictionaries` and
  `intlLocales` in `i18n.ts`, with a new dictionary file like `i18n-es.ts`.

---

## Public web demo

Besides the Android app, the same code builds a **web demo with no sign-in**,
for people who want to try the app or help develop it.

| | Android app (clients) | Web demo (public) |
| - | --- | --- |
| Sign-in | Google, test users only | None |
| Where data is stored | On the phone, one ledger per Google account | In the visitor's own browser; nothing is shared or sent anywhere |
| Built with | `npm run android:apk` | `npm run build:demo` (`NEXT_PUBLIC_DEMO_MODE=true`) |
| Extras | | A "Demo version" banner, **Load example loans** |

- Run it locally with `npm run demo`.
- The Android build script **refuses** to build while `NEXT_PUBLIC_DEMO_MODE`
  is on, so the no-sign-in mode can't end up in the app.
- Like everything in the app, demo data never leaves the browser. Clearing the
  browser's site data erases it.

### Deploying the demo on Vercel

`vercel.json` already tells Vercel how to build it (`npm run build:demo`, a
static export) and adds security headers. Once:

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New… → Project**, import `loan-ledger-android` and click **Deploy**.
   No environment variables are needed.
3. Copy the production URL (e.g. `https://loan-ledger-android.vercel.app`) into
   this README and the repository's **About → Website** field.

From then on, every push to `main` updates the demo, and every pull request gets
its own preview link, so contributors' changes can be tried before merging.

---

## Security and configuration

Read this before you build anything.

- **Never commit secrets.** `.gitignore` already blocks `.env*` (except
  `.env.example`), keystores (`*.jks`, `*.keystore`), `keystore.properties`,
  `google-services.json` and build output. Don't force-add any of them
  (`git add -f`).
- **Bring your own `.env.local`.** Copy `.env.example` and fill in your own
  values. The only value tied to an account is your OAuth **Web** client ID.
  It's public by design (it ends up inside the app), but it's still *yours*:
  don't reuse someone else's.
- **Bring your own Google OAuth clients** ([setup](#google-sign-in-setup)).
  Never put an OAuth **client secret** in this project: it isn't needed, and
  anything inside a mobile app can be extracted.
- **Bring your own signing key** ([how](#create-your-own-signing-key)). Never
  share it, and back it up: losing it means you can't ship updates.
- **Use your own application ID.** If you publish your own build, change
  `com.jordanbrais.loanledger` in `capacitor.config.ts` and
  `android/app/build.gradle` (`namespace` and `applicationId`) to a package name
  you own.
- Before pushing, check what's staged: `git status` and `git diff --cached`.

---

## Getting started (development)

**Prerequisites**

| Tool | Version | Needed for |
| ---- | ------- | ---------- |
| Node.js | 20 or newer (24 recommended) | Everything |
| npm | comes with Node.js | Everything |
| JDK | **21** (Gradle 8.14 doesn't run on newer JDKs) | Android builds |
| Android SDK | Platform 36, Build-Tools 35+ | Android builds |

**Install and run**

```bash
git clone https://github.com/jordanbrais1-hub/loan-ledger-android.git
cd loan-ledger-android
npm install
cp .env.example .env.local   # then fill in your own values (see Configuration)
npm run dev                  # http://localhost:3000
```

In `npm run dev` the sign-in screen also shows **Skip sign-in (development
only)**, so you can work without Google credentials. Release builds never show
it. The skipped sign-in uses a separate local ledger (`loan-ledger-dev-local`).

Before committing, run:

```bash
npm run check   # type-check + ESLint + tests + static build, in one go
```

> **Note:** this project uses a recent Next.js release with breaking changes.
> Check the guides in `node_modules/next/dist/docs/` before changing framework
> code (see `AGENTS.md`).

---

## Configuration

Settings are read from `.env.local` **at build time** (they are baked into the
app), so rebuild after changing them. `.env.local` is git-ignored; copy
`.env.example` to get started.

| Variable | Example | Purpose |
| -------- | ------- | ------- |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `1234…apps.googleusercontent.com` | OAuth **Web application** client ID. Required for Google sign-in, on Android too. |
| `NEXT_PUBLIC_CURRENCY` | `CRC` | Currency pre-selected for new loans: `CRC` or `USD`. Defaults to `CRC`. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Public web demo: no sign-in. Set by `npm run demo` / `build:demo`; leave it out of `.env.local`. |
| `NEXT_PUBLIC_LOCALE` | `en-US` | Locale used to format numbers and dates when the app is in English (BCP 47). In Spanish it's always `es-CR`. |

**Adding another currency:** add its ISO code to `CURRENCIES` (and a label in
`currencyName`) in `src/lib/format.ts`. Everything else, including validation,
backups and totals, picks it up from there.

---

## Google sign-in setup

Done once, in [Google Cloud Console](https://console.cloud.google.com/) →
**Google Auth Platform** (older name: *APIs & Services → OAuth consent screen*).

1. **Branding / App information:** app name `Loan Ledger`, plus your support
   email.
2. **Audience:** *External*, left in **Testing** mode. Under **Test users**, add
   the Gmail address of **every person allowed to use the app**. Only those
   accounts can sign in. To let someone in later, just add them here; no
   rebuild is needed.
3. **Clients → Create client → Web application**
   - Authorized JavaScript origins: `http://localhost:3000` (for the dev server).
   - Copy the **Client ID** into `.env.local` as
     `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`. The client secret is **not** used.
4. **Clients → Create client → Android**
   - Package name: your application ID, exactly as in
     `android/app/build.gradle` (`com.jordanbrais.loanledger` unless you
     changed it). Copy and paste it: a single typo makes sign-in fail.
   - SHA-1 of the key that signs the app. Print it with:
     ```bash
     # release key (the one you create in "Create your own signing key")
     keytool -list -v -keystore android/keystore/loan-ledger-release.jks -alias loanledger
     # debug key (runs from Android Studio; needs its own Android client)
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
     ```
   - If you publish on Google Play with Play App Signing, also add the
     *App signing key* SHA-1 shown in Play Console.
   - Don't paste the Android client ID anywhere; Google matches it by package
     name and SHA-1.
5. Rebuild: `npm run android:apk`.

The app only asks for the `email` and `profile` scopes.

---

## Building the Android app

**Requirements:** **JDK 21** and the **Android SDK**. The build script uses
`JAVA_HOME` / `ANDROID_HOME` when they point at them; otherwise it looks in
`~/Android/jdk-21…` and `~/Android/sdk` (and the default Android Studio SDK
location on Windows).

```bash
npm run android:apk      # → dist/LoanLedger-<version>.apk  (install on any phone)
npm run android:bundle   # → dist/LoanLedger-<version>.aab  (upload to Google Play)
npm run android:open     # sync and open the native project in Android Studio
```

Each command runs `next build`, copies the result into the Android project
(`npx cap sync android`) and runs Gradle. The script warns if
`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` is missing, because sign-in won't work in
that build.

**Installing the APK:** send it to the phone (WhatsApp, Drive, USB…) and open
it; Android will ask you to allow installing from that source. With USB
debugging on you can also run `adb install -r dist/LoanLedger-0.2.2.apk`.

### Create your own signing key

Release builds are signed with `android/keystore/loan-ledger-release.jks`, and
its passwords are in `android/keystore.properties`. **Both are git-ignored and
are not in this repository**, so create them once:

```bash
mkdir -p android/keystore
keytool -genkeypair -v -keystore android/keystore/loan-ledger-release.jks \
  -alias loanledger -keyalg RSA -keysize 2048 -validity 10000
```

Then create `android/keystore.properties` with the passwords you chose:

```properties
storeFile=../keystore/loan-ledger-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=loanledger
keyPassword=YOUR_KEY_PASSWORD
```

**Keep both files safe.** Back them up somewhere private, such as a password
manager. If you lose them, phones that have the app can't install updates
(they would need to uninstall it, losing data that wasn't backed up), and you
can't publish updates to the same app on Google Play.

### Changing the app icon

Edit `assets/icon.svg`, then run `npm run android:assets` to regenerate the
launcher icons and splash screens.

---

## Releasing a new version

1. Bump `versionCode` (by +1) and `versionName` in `android/app/build.gradle`.
   Android refuses to install an update whose `versionCode` isn't higher.
2. Bump `version` in `package.json` (it names the file in `dist/`).
3. `npm run check`
4. `npm run android:apk`
5. Install it over the old version. Data on the phone is kept.
6. Add the changes to [`CHANGELOG.md`](CHANGELOG.md).
7. Commit and tag: `git tag v0.3.0 && git push --tags`.

---

## Backups and moving to a new phone

Data lives only on the phone, so **back up regularly**:

1. Tap your **profile picture** (top right) → **Account & backup**, then
   **Save a backup**. Save the JSON file to Google Drive, email it to yourself,
   etc.
2. On the new phone, install the app, sign in with the **same** Google account,
   then **Account & backup → Restore from backup…**, pick the file and confirm
   **Replace my ledger**.

Restoring **replaces** everything in that account's ledger. Older backups are
still accepted: loans saved before currencies existed come back in the default
currency, and loans saved before repayment plans existed come back as
one-time loans with a yearly rate, exactly as they worked before.

---

## Project structure

```
capacitor.config.ts      Android app id/name; packages the static build in out/
next.config.ts           Static export (no server)
vercel.json              Web demo deployment on Vercel
android/                 Native Android project (Capacitor), signing config
assets/icon.svg          App icon source
scripts/
  android.mjs            Builds the APK / AAB, or opens Android Studio
  android-assets.mjs     Generates launcher icons and splash screens
  demo.mjs               Runs or builds the web demo (no sign-in)
src/
  app/
    layout.tsx           Shell: fonts, nav, sign-in gate
    page.tsx             Dashboard (DashboardView.tsx)
    loans/               List with filters, new, view?id=, edit?id=
    people/              List and view?id=
    settings/            Account, language, sign out, backup/restore, CSV export
    error.tsx            Error screen
    not-found.tsx        404 screen
  components/
    AuthGate.tsx         Sign-in screen; opens the account's ledger; applies the language
    Nav.tsx              Top navigation and the profile menu (language, backup, sign out)
    LoanForm.tsx         Create/edit a loan: currency, plan, schedule, late fee, preview
    EntryForm.tsx        Record a payment, more money lent, a fee or a forgiven amount
    DebtToggle.tsx       "With interest / Without interest" switch and its hook
    Demo.tsx             Web demo banner and "Load example loans" button
    useLocale.ts         React hook for the current language
    PersonForm.tsx       Edit a person's details
    LoanList.tsx         Loan rows with balance and progress
    LoanFilters.tsx      Search, status/direction tabs, sort
    ConfirmButton.tsx    Button with a confirmation dialog
    ui.tsx               Cards, badges, stat cards, fields, buttons
    useFormAction.ts     Form submit/pending/error state helper
  lib/
    db.ts                On-device database (Dexie / IndexedDB), one per account
    queries.ts           Data reads and per-currency totals
    actions.ts           Create/edit/delete loans, payments, people
    auth.ts              Google sign-in and the remembered session
    backup.ts            Backup/restore (JSON) and CSV export
    files.ts             Saving/sharing files (Android share sheet or download)
    loan-math.ts         Loan engine: interest, schedule, payment allocation, status
    loan-math.test.ts    Tests for the loan engine
    plans.ts             Names and one-line descriptions of plans, rates, late fees
    debt-view.ts         The remembered with/without-interest choice
    sample-data.ts       Example loans for the web demo
    i18n.ts              Current language and t() translation function
    i18n-es.ts           Spanish translations
    i18n.test.ts         Checks every string has a Spanish translation
    validation.ts        Form validation (Zod)
    format.ts            Currencies, money and date formatting (per language)
    dates.ts             Date helpers (YYYY-MM-DD strings)
    routes.ts            URL helpers (?id= routes)
    types.ts             Shared types
legacy-web/              Earlier Postgres/server version, kept for reference only
                         (not built, linted or type-checked)
```

---

## Data model

Each account's IndexedDB database has three tables (`src/lib/db.ts`). Dates are
`YYYY-MM-DD` strings; timestamps are ISO strings.

| Table | Fields |
| ----- | ------ |
| `people` | `id`, `name`, `name_lower` (unique, for case-insensitive matching), `phone`, `email`, `notes`, `created_at` |
| `loans` | `id`, `person_id`, `direction` (`lent` / `borrowed`), `currency` (`CRC` / `USD`), `principal`, `interest_rate`, `rate_period` (`month` / `year` / `flat` = fixed %, one-time loans only), `plan` (`single` / `interest_only` / `installments`), `start_date`, `due_date` (single plan), `frequency` (`monthly` / `semimonthly` / `biweekly` / `weekly`), `first_due_date`, `term` (number of payments, or null for open-ended), `amortization` (`declining` / `flat`), `late_fee_type` (`none` / `fixed` / `percent`), `late_fee_value`, `grace_days`, `early_payoff` (`full_period` / `prorated`), `description`, `notes`, `created_at`, `updated_at` |
| `payments` | Every record on a loan: `id`, `loan_id`, `kind` (`payment` / `disbursement` = lent more / `fee` / `waiver` = forgiven), `allocation` for payments (`auto` / `interest` / `principal`), `amount` (same currency as its loan), `paid_on`, `method`, `note`, `created_at` |

**Schema versions:**
- v1: initial tables.
- v2: adds `loans.currency`; existing loans get the default currency.
- v3: adds repayment plans and record kinds. Existing loans become one-time
  loans with a yearly rate (unchanged behaviour); existing payments become
  `kind: payment`, `allocation: auto`.

To change the schema, add a new `db.version(n)` with an `upgrade` in
`createLedger()`. Never edit an old version, because phones already have it.
If the backup format changes, update `backupSchema` in `backup.ts` too, so that
older backups can still be restored.

---

## Scripts

| Script | What it does |
| ------ | ------------ |
| `npm run dev` | Start the dev server |
| `npm run build` | Static build into `out/` |
| `npm run demo` | Run the public web demo (no sign-in) locally |
| `npm run build:demo` | Static build of the web demo (what Vercel deploys) |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check with TypeScript |
| `npm test` | Loan-math tests and the translation check |
| `npm run check` | Type-check, lint, test and build (run before committing) |
| `npm run android:apk` | Build a signed, installable APK into `dist/` |
| `npm run android:bundle` | Build a signed App Bundle for Google Play |
| `npm run android:open` | Sync and open the project in Android Studio |
| `npm run android:assets` | Regenerate launcher icons/splash from `assets/icon.svg` |

---

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| "Google sign-in isn't configured" | `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` was empty at build time. Set it in `.env.local` and rebuild. |
| "Access blocked" / "app has not completed verification" | That Google account isn't a **test user**. Add it under *Audience → Test users*. |
| Sign-in fails with `[16] Account reauth failed` | Run `adb logcat -d \| grep GetTokenResponseHandler`. If it says *not registered to use OAuth2.0* (`UNREGISTERED_ON_API_CONSOLE`), the **Android** OAuth client's package name or SHA-1 doesn't exactly match the APK, or it's in a different Cloud project than the Web client. Check for typos letter by letter. |
| Sign-in fails on the phone (error 10 / `DEVELOPER_ERROR`) | The Android OAuth client's package name or SHA-1 doesn't match the key that signed this APK. Check both (release vs. debug key). |
| Sign-in from `npm run dev` fails | Add the exact origin (e.g. `http://localhost:3000`) to the Web client's *Authorized JavaScript origins*, or use *Skip sign-in*. |
| Phone says "App not installed" when updating | The new APK's `versionCode` isn't higher, or it was signed with a different key. |
| `JDK 21 not found` / `Android SDK not found` | Set `JAVA_HOME` / `ANDROID_HOME`, or install them under `~/Android/`. |
| `Another next dev server is already running` | Use the URL it prints, or stop that process. |

---

## Privacy and security

- Your data **never leaves the phone** unless you export it (backup or CSV).
- Signing in decides **which ledger opens**. It is **not encryption**: someone
  with full access to an unlocked, rooted phone could still read the app's
  storage. Keep a screen lock on the device.
- Signing out locks the ledger again; the data stays on the phone for the next
  sign-in.
- Never commit `.env.local`, `android/keystore.properties` or
  `android/keystore/` (they are git-ignored).
- `legacy-web/docker-compose.yml` contains the throwaway password `ledger` for
  a **local-only** Postgres container from the old version. It isn't a real
  credential; change it if you ever run that container anywhere else.
- Found a security problem? Please report it privately through a
  [security advisory](https://github.com/jordanbrais1-hub/loan-ledger-android/security/advisories/new)
  instead of opening a public issue.

---

## Guía rápida en español

**Idioma:** la app está en español e inglés. Toca tu foto de perfil (arriba a
la derecha) → **Idioma** → **Español**. Si el teléfono está en español, la app
abre en español desde el inicio.

**Para usar la app**
1. Instala el APK en el teléfono y entra con tu cuenta de Google (tiene que
   estar en la lista de *usuarios de prueba*).
2. **+ Nuevo préstamo**: elige si prestaste o te prestaron, la persona, la
   moneda (**₡ CRC** o **$ USD**), el monto y **cómo se va a pagar**:
   - **Pago único:** se paga cuando se pueda, con fecha de pago opcional. La
     tasa puede ser mensual, anual o un **% fijo (una vez)**: ₡100 000 al 20 %
     fijo = ₡120 000, sin importar cuánto tarden.
   - **Solo intereses:** cada mes (o quincena, o semana) se pagan los
     intereses y el préstamo se renueva hasta que devuelvan el capital. Ejemplo:
     ₡100 000 al **10 % mensual** = ₡10 000 de interés cada mes.
   - **Cuotas:** pagos iguales de interés + capital durante un plazo fijo.
   - En **Más opciones** se configura el **recargo por mora** (monto fijo o %,
     con días de gracia) y qué interés cobrar si cancelan antes de tiempo.
3. Dentro del préstamo, en **Registrar**, anota cada movimiento con un toque:
   **Monto pendiente**, **Solo intereses** (el préstamo pasa al mes siguiente),
   **Cancelar todo**, **Abono a capital** u **Otro monto**. También puedes
   **Prestar más**, agregar un **Recargo** o **Condonar** parte de la deuda. El
   **Plan de pagos** muestra cada fecha y si está pagada o atrasada.
4. Haz respaldos seguido: toca tu foto de perfil → **Cuenta y respaldo** →
   **Guardar respaldo**, y guarda el archivo en Drive.

**Deuda total:** cada préstamo muestra la deuda completa con intereses (por
ejemplo, ₡100 000 al 20 % mensual = **₡120 000**). Si pagan los ₡20 000 de
interés, vuelve a ₡100 000. El interruptor **Con intereses / Sin intereses**
(en el préstamo, Inicio, Préstamos y Personas) cambia todos los totales para
ver solo el capital.

**Para dar acceso a otra persona:** agrega su Gmail en Google Cloud Console →
*Google Auth Platform → Público → Usuarios de prueba*. No hace falta volver a
generar el APK.

**Para generar una versión nueva:** sube `versionCode` en
`android/app/build.gradle` y ejecuta `npm run android:apk`. El archivo queda en
`dist/`.

**Versión web de prueba:** hay una demo sin inicio de sesión para quien quiera
probar la app o colaborar (ver [Public web demo](#public-web-demo)). Los datos
quedan solo en el navegador de cada persona.

**Novedades de cada versión:** ver el [historial de cambios](CHANGELOG.md).

**Importante:** guarda en un lugar seguro `android/keystore/` y
`android/keystore.properties`. No están en el repositorio y sin ellos no se
pueden instalar actualizaciones.

---

## License

[MIT](LICENSE) © 2026 Jordan Brais
