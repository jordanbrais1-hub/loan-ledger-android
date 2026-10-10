# Loan Ledger

A simple, friendly app that replaces the notebook where you write down money
you lend and borrow. It is an **offline Android app**: every record is stored on
the phone, nothing is sent to a server, and you sign in with Google so each
person gets their own private ledger.

Loans can be in **Costa Rican colones (₡ CRC)** or **US dollars ($ USD)**.

> Built with **Next.js 16 (App Router, static export)**, **React 19 +
> TypeScript**, **Tailwind CSS 4**, **Dexie (IndexedDB)**, **Zod** and
> **Capacitor 8**.

> [!IMPORTANT]
> This repository contains **no credentials**. To run or build it you must
> create your **own** Google OAuth clients, your **own** `.env.local` and your
> **own** Android signing key. See [Security and configuration](#security-and-configuration).

---

## Table of contents

1. [Features](#features)
2. [How it works](#how-it-works)
3. [How the money math works](#how-the-money-math-works)
4. [Security and configuration](#security-and-configuration)
5. [Getting started (development)](#getting-started-development)
6. [Configuration](#configuration)
7. [Google sign-in setup](#google-sign-in-setup)
8. [Building the Android app](#building-the-android-app)
9. [Releasing a new version](#releasing-a-new-version)
10. [Backups and moving to a new phone](#backups-and-moving-to-a-new-phone)
11. [Project structure](#project-structure)
12. [Data model](#data-model)
13. [Scripts](#scripts)
14. [Troubleshooting](#troubleshooting)
15. [Privacy and security](#privacy-and-security)
16. [Guía rápida en español](#guía-rápida-en-español)
17. [License](#license)

---

## Features

| Area | What you get |
| ---- | ------------ |
| **Dashboard** | How much you're owed, how much you owe, your net position, the number of open loans, loans that are overdue or due within 7 days, and recent payments. |
| **Loans** | Add, edit and delete loans in either direction ("I lent money" / "I borrowed money"), with currency, amount, date, optional due date, optional interest rate, purpose and notes. |
| **Two currencies** | Each loan is in colones (₡) or dollars ($). Totals are kept **separately per currency**; the app never converts between them. |
| **Payments** | Record partial or full repayments (the **Full** button fills in the remaining balance), with date, method and note. Remove a payment if it was a mistake; the balance is recalculated. |
| **Automatic math** | Balance, interest so far, total to repay, % repaid and status (**Active**, **Overdue**, **Paid off**). |
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

## How the money math works

All of it lives in `src/lib/loan-math.ts`.

- Interest is **simple annual interest** (it doesn't compound) on the principal
  that is still owed, and it builds up **day by day** (`rate / 365` per day).
- Payments are applied in date order. Each payment pays the interest owed so far
  first, then the principal.
- Once a loan is fully repaid, no more interest is added.
- Set the rate to **0** for an interest-free loan.
- A loan is **Overdue** when it has a balance and its due date has passed.
- Totals (dashboard, loan list, people) are **summed per currency**. If you have
  loans in both currencies you'll see two figures, for example
  `₡150,000.00` and `-$200.00`.

**Example:** you lend ₡100,000 at 12% per year on 1 January. After 31 days the
interest is 100,000 × 0.12 / 365 × 31 ≈ ₡1,019.18. If they pay ₡20,000 that
day, ₡1,019.18 covers the interest and ₡18,980.82 reduces the principal to
₡81,019.18. From then on, interest builds up on ₡81,019.18.

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
npm run check   # type-check + ESLint + static build, in one go
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
| `NEXT_PUBLIC_LOCALE` | `en-US` | Locale used to format numbers and dates (BCP 47). |

**Adding another currency:** add its ISO code to `CURRENCIES` (and a label to
`currencyNames`) in `src/lib/format.ts`. Everything else, including validation,
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
debugging on you can also run `adb install -r dist/LoanLedger-0.1.0.apk`.

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
6. Commit and tag: `git tag v0.2.0 && git push --tags`.

---

## Backups and moving to a new phone

Data lives only on the phone, so **back up regularly**:

1. Tap your **profile circle** (top right) to open **Account & backup**, then
   **Save a backup**. Save the JSON file to Google Drive, email it to yourself,
   etc.
2. On the new phone, install the app, sign in with the **same** Google account,
   then **Account & backup → Restore from backup…**, pick the file and confirm
   **Replace my ledger**.

Restoring **replaces** everything in that account's ledger. Backups made before
loans had a currency are still accepted; those loans come back in the default
currency.

---

## Project structure

```
capacitor.config.ts      Android app id/name; packages the static build in out/
next.config.ts           Static export (no server)
android/                 Native Android project (Capacitor), signing config
assets/icon.svg          App icon source
scripts/
  android.mjs            Builds the APK / AAB, or opens Android Studio
  android-assets.mjs     Generates launcher icons and splash screens
src/
  app/
    layout.tsx           Shell: fonts, nav, sign-in gate
    page.tsx             Dashboard (DashboardView.tsx)
    loans/               List with filters, new, view?id=, edit?id=
    people/              List and view?id=
    settings/            Account, sign out, backup/restore, CSV export
    error.tsx            Error screen
    not-found.tsx        404 screen
  components/
    AuthGate.tsx         Sign-in screen; opens the account's ledger
    Nav.tsx              Top navigation
    LoanForm.tsx         Create/edit a loan (incl. currency picker)
    PaymentForm.tsx      Record a payment
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
    loan-math.ts         Balance / interest / status calculation
    validation.ts        Form validation (Zod)
    format.ts            Currencies, money and date formatting
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
| `loans` | `id`, `person_id`, `direction` (`lent` / `borrowed`), `currency` (`CRC` / `USD`), `principal`, `interest_rate` (% per year), `start_date`, `due_date`, `description`, `notes`, `created_at`, `updated_at` |
| `payments` | `id`, `loan_id`, `amount` (same currency as its loan), `paid_on`, `method`, `note`, `created_at` |

**Schema versions:**
- v1: initial tables.
- v2: adds `loans.currency`; existing loans get the default currency.

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
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check with TypeScript |
| `npm run check` | Type-check, lint and build (run before committing) |
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

**Para usar la app**
1. Instala el APK en el teléfono y entra con tu cuenta de Google (tiene que
   estar en la lista de *usuarios de prueba*).
2. **+ New loan**: elige si prestaste (*I lent*) o te prestaron (*I borrowed*),
   la persona, la moneda (**₡ CRC** o **$ USD**) y el monto.
3. Dentro del préstamo, en **Record a payment**, anota cada abono. **Full**
   rellena el saldo completo.
4. Haz respaldos seguido: toca el círculo de tu perfil (arriba a la derecha) →
   **Save a backup**, y guarda el archivo en Drive.

**Para dar acceso a otra persona:** agrega su Gmail en Google Cloud Console →
*Google Auth Platform → Público → Usuarios de prueba*. No hace falta volver a
generar el APK.

**Para generar una versión nueva:** sube `versionCode` en
`android/app/build.gradle` y ejecuta `npm run android:apk`. El archivo queda en
`dist/`.

**Importante:** guarda en un lugar seguro `android/keystore/` y
`android/keystore.properties`. No están en el repositorio y sin ellos no se
pueden instalar actualizaciones.

---

## License

[MIT](LICENSE) © 2026 Jordan Brais
