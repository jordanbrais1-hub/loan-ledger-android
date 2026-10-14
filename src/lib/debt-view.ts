import type { LoanSummary } from "./types";

/** Whether amounts owed include the interest the loans carry. Remembered on this device. */
export type DebtView = "with" | "without";

const STORAGE_KEY = "loan-ledger:debt-view";
let active: DebtView = "with";
let restored = false;
const listeners = new Set<() => void>();

export function getDebtView(): DebtView {
  // Read lazily so prerendering (no localStorage) and the first render agree on "with".
  if (!restored && typeof window !== "undefined") {
    restored = true;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "without") active = "without";
    } catch {
      // Storage unavailable: keep the default.
    }
  }
  return active;
}

export function setDebtView(view: DebtView) {
  active = view;
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Storage unavailable: the choice lasts until the app closes.
  }
  listeners.forEach((notify) => notify());
}

export function subscribeDebtView(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** What's owed on a loan in the chosen view. */
export function debtOf(summary: Pick<LoanSummary, "debtWithInterest" | "debtWithoutInterest">, view: DebtView): number {
  return view === "with" ? summary.debtWithInterest : summary.debtWithoutInterest;
}
