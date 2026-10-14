import { intlLocale, t } from "./i18n";

/** Currencies a loan can be in. Totals are never mixed: each is summed separately. */
export const CURRENCIES = ["CRC", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const currencyName = (c: Currency) => (c === "CRC" ? t("Colones (₡)") : t("Dollars ($)"));

const envCurrency = process.env.NEXT_PUBLIC_CURRENCY as Currency | undefined;
/** Pre-selected for new loans, and used for older records saved before loans had a currency. */
export const DEFAULT_CURRENCY: Currency = envCurrency && CURRENCIES.includes(envCurrency) ? envCurrency : "CRC";

/** An amount per currency, e.g. { CRC: 150000, USD: 200 }. */
export type Amounts = Record<Currency, number>;
export const zeroAmounts = (): Amounts => ({ CRC: 0, USD: 0 });

// Formatters are slow to create, so keep one per language.
const moneyFmts = new Map<string, Record<Currency, Intl.NumberFormat>>();
const dateFmts = new Map<string, Intl.DateTimeFormat>();

export function formatMoney(n: number, currency: Currency): string {
  const locale = intlLocale();
  let fmts = moneyFmts.get(locale);
  if (!fmts) {
    fmts = Object.fromEntries(
      CURRENCIES.map((c) => [c, new Intl.NumberFormat(locale, { style: "currency", currency: c, currencyDisplay: "narrowSymbol" })]),
    ) as Record<Currency, Intl.NumberFormat>;
    moneyFmts.set(locale, fmts);
  }
  return fmts[currency].format(n);
}

/** The non-zero amounts, one per currency (or a single zero when there are none). */
export function amountLines(amounts: Amounts, { abs = false } = {}): string[] {
  const lines = CURRENCIES.filter((c) => Math.abs(amounts[c]) >= 0.005).map((c) =>
    formatMoney(abs ? Math.abs(amounts[c]) : amounts[c], c),
  );
  return lines.length ? lines : [formatMoney(0, DEFAULT_CURRENCY)];
}

/** e.g. "₡150,000.00 and $200.00". */
export function formatAmounts(amounts: Amounts, opts?: { abs?: boolean }): string {
  return amountLines(amounts, opts).join(t(" and "));
}

/** 1 if every non-zero amount is positive, -1 if every one is negative, 0 if all zero or mixed. */
export function amountsSign(amounts: Amounts): -1 | 0 | 1 {
  const values = CURRENCIES.map((c) => amounts[c]).filter((v) => Math.abs(v) >= 0.005);
  if (values.length && values.every((v) => v > 0)) return 1;
  if (values.length && values.every((v) => v < 0)) return -1;
  return 0;
}

/** Formats a YYYY-MM-DD string. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const locale = intlLocale();
  let fmt = dateFmts.get(locale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
    dateFmts.set(locale, fmt);
  }
  return fmt.format(new Date(iso + "T00:00:00Z"));
}

export function describeDue(daysUntilDue: number | null): string | null {
  if (daysUntilDue === null) return null;
  if (daysUntilDue === 0) return t("Due today");
  if (daysUntilDue === 1) return t("Due tomorrow");
  if (daysUntilDue > 1) return t("Due in {n} days", { n: daysUntilDue });
  if (daysUntilDue === -1) return t("1 day overdue");
  return t("{n} days overdue", { n: -daysUntilDue });
}
