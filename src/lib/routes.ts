// A static app can't have `/loans/[id]` routes (every page is a file built
// ahead of time), so records are addressed with a query string instead.

export const loanHref = (id: number) => `/loans/view?id=${id}`;
export const editLoanHref = (id: number) => `/loans/edit?id=${id}`;
export const personHref = (id: number) => `/people/view?id=${id}`;
export const newLoanHref = (personName?: string) =>
  personName ? `/loans/new?person=${encodeURIComponent(personName)}` : "/loans/new";

/** Reads a positive integer `id` from the query string, or null. */
export function parseId(raw: string | null): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
