import type { Frequency } from "./types";

const MS_PER_DAY = 86_400_000;

/** Today's date in the server/browser's local timezone, as YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Whole days from a to b (both YYYY-MM-DD). Negative if b is before a. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / MS_PER_DAY);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Adds months, keeping the day of the month (clamped: Jan 31 + 1 month = Feb 28/29). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Adds `n` payment periods. Monthly periods keep the day of the month.
 * Twice-a-month periods alternate between that day and 15 days later
 * (e.g. the 15th and the 30th, clamped to the end of the month).
 */
export function addPeriods(iso: string, frequency: Frequency, n: number): string {
  if (frequency === "monthly") return addMonths(iso, n);
  if (frequency === "semimonthly") {
    const base = addMonths(iso, Math.floor(n / 2));
    if (n % 2 === 0) return base;
    const [y, m] = base.split("-").map(Number);
    const day = Number(iso.slice(8, 10));
    if (day <= 15) return `${base.slice(0, 8)}${String(Math.min(day + 15, lastDayOfMonth(y, m))).padStart(2, "0")}`;
    const next = addMonths(`${base.slice(0, 8)}01`, 1);
    return `${next.slice(0, 8)}${String(day - 15).padStart(2, "0")}`;
  }
  return addDays(iso, n * (frequency === "biweekly" ? 14 : 7));
}
