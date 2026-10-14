import { formatMoney } from "./format";
import { t } from "./i18n";
import type { Frequency, Loan, LoanSummary, Plan, RatePeriod } from "./types";

export function planName(plan: Plan): string {
  switch (plan) {
    case "single":
      return t("One-time repayment");
    case "interest_only":
      return t("Interest only");
    case "installments":
      return t("Installments");
  }
}

export function planDetail(plan: Plan): string {
  switch (plan) {
    case "single":
      return t("Paid back all at once (or bit by bit), with an optional due date.");
    case "interest_only":
      return t("They pay the interest each period. The loan rolls over until the principal is repaid.");
    case "installments":
      return t("Equal payments that cover interest and principal until it's paid off.");
  }
}

/** "Monthly", "Twice a month", … */
export function frequencyName(frequency: Frequency): string {
  switch (frequency) {
    case "monthly":
      return t("Monthly");
    case "semimonthly":
      return t("Twice a month (15th & 30th)");
    case "biweekly":
      return t("Every 2 weeks");
    case "weekly":
      return t("Weekly");
  }
}

/** The noun for one period: "month", "half-month", … */
export function periodNoun(frequency: Frequency): string {
  switch (frequency) {
    case "monthly":
      return t("month");
    case "semimonthly":
      return t("half-month");
    case "biweekly":
      return t("2 weeks");
    case "weekly":
      return t("week");
  }
}

/** e.g. "12 monthly payments". */
function paymentCount(n: number | null, frequency: Frequency): string {
  const vars = { n: n ?? "?" };
  switch (frequency) {
    case "monthly":
      return t("{n} monthly payments", vars);
    case "semimonthly":
      return t("{n} twice-monthly payments", vars);
    case "biweekly":
      return t("{n} payments every 2 weeks", vars);
    case "weekly":
      return t("{n} weekly payments", vars);
  }
}

export function ratePeriodName(period: RatePeriod): string {
  return period === "month" ? t("% per month") : period === "year" ? t("% per year") : t("% fixed (once)");
}

export function describeRate(loan: Pick<Loan, "interest_rate" | "rate_period">): string {
  if (!(loan.interest_rate > 0)) return t("No interest");
  if (loan.rate_period === "flat") return t("{rate}% fixed (charged once)", { rate: loan.interest_rate });
  return loan.rate_period === "month"
    ? t("{rate}% per month", { rate: loan.interest_rate })
    : t("{rate}% per year", { rate: loan.interest_rate });
}

/** A one-line description of how the loan is repaid, e.g. "12 monthly payments of ₡14,676.33". */
export function describePlan(loan: Loan, summary?: Pick<LoanSummary, "installment">): string {
  const freq = frequencyName(loan.frequency).toLowerCase();
  switch (loan.plan) {
    case "single":
      return planName("single");
    case "interest_only":
      if (!loan.term) return t("Interest only, {freq}, until repaid", { freq });
      return loan.term === 1
        ? t("Interest only, {freq}, for 1 payment", { freq })
        : t("Interest only, {freq}, for {n} payments", { freq, n: loan.term });
    case "installments": {
      const count = paymentCount(loan.term, loan.frequency);
      const flat = loan.amortization === "flat" ? t(" (flat interest)") : "";
      return summary?.installment
        ? t("{count} of {amount}", { count, amount: formatMoney(summary.installment, loan.currency) }) + flat
        : count + flat;
    }
  }
}

/** e.g. "5% of what's late, after 3 days of grace" / "₡2,000.00". */
export function describeLateFee(loan: Loan): string | null {
  if (loan.late_fee_type === "none") return null;
  const amount =
    loan.late_fee_type === "fixed"
      ? formatMoney(loan.late_fee_value, loan.currency)
      : t("{pct}% of what's late", { pct: loan.late_fee_value });
  if (!loan.grace_days) return amount;
  return loan.grace_days === 1
    ? t("{amount}, after 1 day of grace", { amount })
    : t("{amount}, after {n} days of grace", { amount, n: loan.grace_days });
}
