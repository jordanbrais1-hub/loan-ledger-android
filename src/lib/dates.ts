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
