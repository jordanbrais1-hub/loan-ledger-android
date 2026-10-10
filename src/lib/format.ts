const locale = process.env.NEXT_PUBLIC_LOCALE || "en-US";

/** Currencies a loan can be in. Totals are never mixed: each is summed separately. */
export const CURRENCIES = ["CRC", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const currencyNames: Record<Currency, string> = { CRC: "Colones (₡)", USD: "Dollars ($)" };

const envCurrency = process.env.NEXT_PUBLIC_CURRENCY as Currency | undefined;
/** Pre-selected for new loans, and used for older records saved before loans had a currency. */
export const DEFAULT_CURRENCY: Currency = envCurrency && CURRENCIES.includes(envCurrency) ? envCurrency : "CRC";

/** An amount per currency, e.g. { CRC: 150000, USD: 200 }. */
export type Amounts = Record<Currency, number>;
export const zeroAmounts = (): Amounts => ({ CRC: 0, USD: 0 });

const moneyFmt = Object.fromEntries(
  CURRENCIES.map((c) => [c, new Intl.NumberFormat(locale, { style: "currency", currency: c, currencyDisplay: "narrowSymbol" })]),
) as Record<Currency, Intl.NumberFormat>;
const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

export function formatMoney(n: number, currency: Currency): string {
  return moneyFmt[currency].format(n);
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
  return amountLines(amounts, opts).join(" and ");
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
  return dateFmt.format(new Date(iso + "T00:00:00Z"));
}

export function describeDue(daysUntilDue: number | null): string | null {
  if (daysUntilDue === null) return null;
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  if (daysUntilDue > 1) return `Due in ${daysUntilDue} days`;
  if (daysUntilDue === -1) return "1 day overdue";
  return `${-daysUntilDue} days overdue`;
}
