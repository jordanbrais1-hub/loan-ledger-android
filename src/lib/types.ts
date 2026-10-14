import type { Currency } from "./format";

export type Direction = "lent" | "borrowed";
export type LoanStatus = "active" | "overdue" | "paid";

/**
 * How a loan is repaid:
 * - `single`: one repayment whenever (or by a due date); interest builds up daily.
 * - `interest_only`: each period the borrower owes the interest; paying just that
 *   rolls the loan over. The principal is repaid at the end (or whenever).
 * - `installments`: equal periodic payments of interest + principal.
 */
export const PLANS = ["single", "interest_only", "installments"] as const;
export type Plan = (typeof PLANS)[number];

/** `semimonthly` = twice a month (quincenal: e.g. the 15th and the 30th); `biweekly` = every 14 days. */
export const FREQUENCIES = ["monthly", "semimonthly", "biweekly", "weekly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** What the interest rate is quoted per. */
export const RATE_PERIODS = ["month", "year"] as const;
export type RatePeriod = (typeof RATE_PERIODS)[number];

/** Installment interest: on the remaining balance (amortized), or on the original amount every period. */
export const AMORTIZATIONS = ["declining", "flat"] as const;
export type Amortization = (typeof AMORTIZATIONS)[number];

export const LATE_FEE_TYPES = ["none", "fixed", "percent"] as const;
export type LateFeeType = (typeof LATE_FEE_TYPES)[number];

/** Interest for the current period when a loan is paid off early. */
export const EARLY_PAYOFFS = ["full_period", "prorated"] as const;
export type EarlyPayoff = (typeof EARLY_PAYOFFS)[number];

/**
 * Everything recorded on a loan:
 * - `payment`: money paid towards it.
 * - `disbursement`: more money lent on the same loan.
 * - `fee`: an extra charge (e.g. a late fee added by hand).
 * - `waiver`: part of the debt forgiven (fees, then interest, then principal).
 */
export const ENTRY_KINDS = ["payment", "disbursement", "fee", "waiver"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/**
 * Where a payment goes:
 * - `auto`: fees, then interest, then principal due; anything extra is kept for
 *   the next payment and the rest reduces the principal.
 * - `interest`: only interest (the loan rolls over).
 * - `principal`: straight to the principal (abono a capital).
 */
export const ALLOCATIONS = ["auto", "interest", "principal"] as const;
export type Allocation = (typeof ALLOCATIONS)[number];

export interface Person {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface Payment {
  id: number;
  loan_id: number;
  kind: EntryKind;
  allocation: Allocation;
  amount: number;
  paid_on: string;
  method: string | null;
  note: string | null;
}

/** The repayment terms of a loan. */
export interface LoanTerms {
  plan: Plan;
  principal: number;
  interest_rate: number;
  rate_period: RatePeriod;
  start_date: string;
  /** `single` plan only: when it should be repaid. */
  due_date: string | null;
  /** Periodic plans: how often a payment is due. */
  frequency: Frequency;
  /** Periodic plans: the first due date (default: one period after the start). */
  first_due_date: string | null;
  /** Number of payments. Required for installments; optional for interest-only (open-ended when null). */
  term: number | null;
  amortization: Amortization;
  late_fee_type: LateFeeType;
  late_fee_value: number;
  /** Days after a due date before the late fee is charged. */
  grace_days: number;
  early_payoff: EarlyPayoff;
}

export interface Loan extends LoanTerms {
  id: number;
  person_id: number;
  person_name: string;
  direction: Direction;
  currency: Currency;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export type ScheduleStatus = "paid" | "partial" | "overdue" | "due" | "upcoming";

/** One period of a periodic loan: what was (or will be) charged and how much of it is paid. */
export interface ScheduleRow {
  number: number;
  dueDate: string;
  interest: number;
  principal: number;
  fees: number;
  total: number;
  paid: number;
  status: ScheduleStatus;
}

/** How one entry was applied. */
export interface EntryEffect {
  fees: number;
  interest: number;
  principal: number;
  /** Kept as credit for upcoming charges (or overpaid). */
  credit: number;
}

export interface LoanSummary {
  /** Principal still owed (including principal that is already due). */
  principalLeft: number;
  /** Interest charged and not yet paid. */
  interestDue: number;
  /** Fees charged and not yet paid. */
  feesDue: number;
  /** Everything due today or earlier and not yet paid. */
  dueNow: number;
  /** The part of `dueNow` whose due date has passed. */
  overdue: number;
  /** What it takes to close the loan today. */
  payoff: number;
  /** Paid in advance and not yet applied (or overpaid). */
  credit: number;
  /** The next charge: either something already due, or the next scheduled one. */
  next: { date: string; amount: number; interest: number; principal: number } | null;
  /** The fixed installment amount, for installment plans. */
  installment: number | null;
  /** When the principal is due in full: the due date, the last installment, or the end of the term. */
  maturityDate: string | null;
  /** Periods with something past due. */
  periodsBehind: number;
  /** Total lent, including later disbursements. */
  lent: number;
  /** Interest charged so far, including the current period up to today. */
  interest: number;
  fees: number;
  waived: number;
  paid: number;
  /** Lent + interest + fees − waived. */
  totalDue: number;
  /** Same as `payoff`, never negative: what is still owed. */
  balance: number;
  progress: number;
  status: LoanStatus;
  /** Days until the next due date; negative when overdue. */
  daysUntilDue: number | null;
  /** Periodic plans: past periods and the next few upcoming ones. */
  schedule: ScheduleRow[] | null;
  effects: Record<number, EntryEffect>;
}

export type LoanWithSummary = Loan & { summary: LoanSummary };

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
  /** The record that was created or saved, when an action produces one. */
  id?: number;
}
