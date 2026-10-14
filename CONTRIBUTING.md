# Contributing to Loan Ledger

Thanks for helping! Bug reports, ideas, translations and pull requests are all
welcome. *Las contribuciones en español también son bienvenidas.*

## Try it

- **Web demo** (no sign-in, nothing to install): see the link in the
  [README](README.md#public-web-demo). Use **Load example loans** to start with
  some data. Everything you enter stays in your own browser.
- **Locally:**

  ```bash
  git clone https://github.com/jordanbrais1-hub/loan-ledger-android.git
  cd loan-ledger-android
  npm install
  npm run demo        # the demo, at http://localhost:3000, no Google setup needed
  ```

  `npm run dev` runs the regular app; it also offers *Skip sign-in
  (development only)*.

You don't need Google credentials, a signing key or the Android SDK unless you
work on sign-in or the Android build.

## Making a change

1. Fork the repository and create a branch: `git checkout -b fix/late-fee-rounding`.
2. Make your change. Keep pull requests small and focused on one thing.
3. Run the full check. It must pass:

   ```bash
   npm run check   # type-check, lint, tests and a static build
   ```

4. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat: …`, `fix: …`, `docs: …`) and open a pull request. Describe what
   changed and how you tested it.

Every pull request gets its own **Deploy Preview** of the web demo, so the
change can be tried before it's merged.

## Guidelines

- **Money math** lives in `src/lib/loan-math.ts`. Add or update a test in
  `src/lib/loan-math.test.ts` for any change to how interest, payments or
  balances are calculated.
- **Text** shown to people goes through `t("English text")` from
  `src/lib/i18n.ts`, with its Spanish in `src/lib/i18n-es.ts`. `npm test` fails
  if a translation is missing. If you don't speak Spanish, add your best guess
  and mention it in the pull request.
- **Data** is stored on the device with Dexie. Changing the schema means a new
  `db.version(n)` in `src/lib/db.ts` (never edit an old one), and keeping
  `backupSchema` in `src/lib/backup.ts` able to read older backups.
- This project uses a recent **Next.js** release with breaking changes; check
  `node_modules/next/dist/docs/` before changing framework code.
- See the [README](README.md) for how the app and the money math work.

## Never commit

Secrets or personal data: `.env*` files (except `.env.example`), keystores,
`keystore.properties`, `google-services.json`, OAuth client secrets, or real
people's names, phone numbers and amounts. Use made-up examples.

## Security issues

Please report them privately through a
[security advisory](https://github.com/jordanbrais1-hub/loan-ledger-android/security/advisories/new),
not in a public issue.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
