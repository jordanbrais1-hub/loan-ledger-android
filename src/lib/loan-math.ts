import { daysBetween, todayISO } from "./dates";
import type { Loan, LoanSummary, Payment } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Works out where a loan stands today.
 *
 * Interest is simple (non-compounding) annual interest on the outstanding
 * principal. Walking through payments in date order, interest accrues between
 * each payment, and each payment pays off accrued interest first, then
 * principal. Once the loan is fully repaid, no more interest accrues.
 */
export function summarizeLoan(
  loan: Pick<Loan, "principal" | "interest_rate" | "start_date" | "due_date">,
  payments: Pick<Payment, "amount" | "paid_on">[],
  asOf: string = todayISO(),
): LoanSummary {
  const dailyRate = loan.interest_rate / 100 / 365;
  const sorted = [...payments].sort((a, b) => a.paid_on.localeCompare(b.paid_on));

  let principalLeft = loan.principal;
  let interestOwed = 0;
  let interestTotal = 0;
  let paid = 0;
  let cursor = loan.start_date;

  const accrueTo = (date: string) => {
    const days = Math.max(0, daysBetween(cursor, date));
    const accrued = principalLeft * dailyRate * days;
    interestOwed += accrued;
    interestTotal += accrued;
    if (date > cursor) cursor = date;
  };

  for (const p of sorted) {
    if (p.paid_on > asOf) continue;
    accrueTo(p.paid_on);
    paid += p.amount;
    const toInterest = Math.min(p.amount, interestOwed);
    interestOwed -= toInterest;
    principalLeft = Math.max(0, principalLeft - (p.amount - toInterest));
  }
  accrueTo(asOf);

  const balance = round2(principalLeft + interestOwed);
  const totalDue = round2(loan.principal + interestTotal);
  const daysUntilDue = loan.due_date ? daysBetween(asOf, loan.due_date) : null;
  const status =
    balance <= 0 ? "paid" : daysUntilDue !== null && daysUntilDue < 0 ? "overdue" : "active";

  return {
    interest: round2(interestTotal),
    paid: round2(paid),
    totalDue,
    balance,
    progress: totalDue > 0 ? Math.min(1, paid / totalDue) : 1,
    status,
    daysUntilDue,
  };
}
