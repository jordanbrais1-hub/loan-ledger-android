import { addDays, addPeriods, daysBetween, todayISO } from "./dates";
import type {
  Amortization,
  EntryEffect,
  Frequency,
  LoanSummary,
  LoanTerms,
  Payment,
  RatePeriod,
  ScheduleRow,
} from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;
const EPS = 0.005;

/** Periods per year, used to turn a monthly rate into a per-period rate. */
const PERIODS_PER_YEAR: Record<Frequency, number> = { monthly: 12, semimonthly: 24, biweekly: 26, weekly: 52 };

/** The rate as a fraction per month (5% per year → 0.05 / 12). A flat rate doesn't grow with time: 0. */
export function monthlyRate(rate: number, ratePeriod: RatePeriod): number {
  if (ratePeriod === "flat") return 0;
  return rate / 100 / (ratePeriod === "year" ? 12 : 1);
}

/** The interest rate for one payment period, as a fraction (10% per month, twice a month → 0.05). */
export function periodRate(rate: number, ratePeriod: RatePeriod, frequency: Frequency): number {
  return (monthlyRate(rate, ratePeriod) * 12) / PERIODS_PER_YEAR[frequency];
}

/**
 * The installment plan agreed at the start: the principal part of each
 * installment, and the installment amount (assuming payments are on time).
 */
export function installmentPlan(principal: number, rate: number, n: number, amortization: Amortization) {
  if (n < 1 || principal <= 0) return { installment: 0, principalParts: [] as number[], totalInterest: 0 };
  const parts: number[] = [];
  let installment: number;
  let totalInterest = 0;
  if (amortization === "flat") {
    const part = round2(principal / n);
    for (let i = 0; i < n; i++) parts.push(i === n - 1 ? round2(principal - part * (n - 1)) : part);
    const interest = round2(principal * rate);
    installment = round2(part + interest);
    totalInterest = round2(interest * n);
  } else {
    installment = rate > 0 ? principal * rate / (1 - Math.pow(1 + rate, -n)) : principal / n;
    let left = principal;
    for (let i = 0; i < n; i++) {
      const interest = left * rate;
      const part = i === n - 1 ? round2(left) : round2(installment - interest);
      totalInterest += interest;
      parts.push(part);
      left = round2(left - part);
    }
    installment = round2(installment);
    totalInterest = round2(totalInterest);
  }
  return { installment, principalParts: parts, totalInterest };
}

type Entry = Pick<Payment, "id" | "kind" | "allocation" | "amount" | "paid_on">;
type BucketType = "fee" | "interest" | "principal";
interface Bucket {
  period: number;
  due: string;
  type: BucketType;
  amount: number;
  remaining: number;
}
const TYPE_ORDER: Record<BucketType, number> = { fee: 0, interest: 1, principal: 2 };

/**
 * Works out where a loan stands on `asOf` by replaying its history in date order.
 *
 * - **single**: simple interest builds up day by day on the principal and can be
 *   paid at any time; everything is due on the due date.
 * - **interest_only / installments**: interest builds up day by day within each
 *   period and is charged on the period's due date, together with any principal
 *   due (the installment's principal part, or everything at the end of the term).
 *
 * Payments clear the oldest charges first (fees → interest → principal). Money
 * paid before anything is due is held as credit for the next charge; anything
 * beyond that reduces the principal. Late fees are charged once per period
 * that is still unpaid `grace_days` after its due date.
 */
export function summarizeLoan(terms: LoanTerms, entries: Entry[], asOf: string = todayISO()): LoanSummary {
  const periodic = terms.plan !== "single";
  const freq = terms.frequency;
  const rate = periodic
    ? periodRate(terms.interest_rate, terms.rate_period, freq)
    : (monthlyRate(terms.interest_rate, terms.rate_period) * 12) / 365; // per day
  const firstDue = terms.first_due_date ?? addPeriods(terms.start_date, freq, 1);
  const dueOf = (k: number) => (k <= 0 ? terms.start_date : addPeriods(firstDue, freq, k - 1));
  // Length of period k in days. The first period is measured against a normal
  // period, so a longer or shorter first period is charged proportionally.
  const standardLength = (k: number) =>
    k === 1 ? daysBetween(terms.start_date, addPeriods(terms.start_date, freq, 1)) : daysBetween(dueOf(k - 1), dueOf(k));
  const term = terms.plan === "single" ? null : terms.term;
  const flat = terms.plan === "installments" && terms.amortization === "flat";
  const plan =
    terms.plan === "installments" && term ? installmentPlan(terms.principal, rate, term, terms.amortization) : null;

  let P = 0; // principal outstanding
  let lent = 0;
  let paid = 0;
  let waived = 0;
  let interestCharged = 0;
  let feesCharged = 0;
  let credit = 0;
  let accruing = 0; // interest of the current period, not yet charged
  let k = 1; // next period to charge
  let cursor = terms.start_date;
  let closed = false;
  const buckets: Bucket[] = [];
  const lateChecks: { date: string; period: number }[] = [];
  const effects: Record<number, EntryEffect> = {};

  const outstanding = (filter?: (b: Bucket) => boolean) =>
    buckets.reduce((sum, b) => (filter && !filter(b) ? sum : sum + b.remaining), 0);
  const ordered = () =>
    buckets
      .filter((b) => b.remaining > EPS)
      .sort((a, b) => a.period - b.period || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);

  /** Pays open charges (oldest first) of the given types; returns what's left of `amount`. */
  function payBuckets(amount: number, types: BucketType[], effect?: EntryEffect): number {
    for (const b of ordered()) {
      if (amount <= EPS) break;
      if (!types.includes(b.type)) continue;
      const x = round2(Math.min(amount, b.remaining));
      b.remaining = round2(b.remaining - x);
      amount = round2(amount - x);
      if (b.type === "principal") P = round2(P - x);
      if (effect) effect[b.type === "fee" ? "fees" : b.type] = round2(effect[b.type === "fee" ? "fees" : b.type] + x);
    }
    return amount;
  }

  function applyCredit() {
    if (credit > EPS) credit = payBuckets(credit, ["fee", "interest", "principal"]);
  }

  /** The base interest is charged on: the original amount for flat installments within the term. */
  const interestBase = () => (flat && (!term || k <= term) ? terms.principal : P);

  /** One-time loans at a flat rate: the interest on money lent is charged once, when it's lent. */
  const flatRate = !periodic && terms.rate_period === "flat" ? terms.interest_rate / 100 : 0;
  function chargeFlatInterest(amountLent: number) {
    const interest = round2(amountLent * flatRate);
    if (interest <= EPS) return;
    let bucket = buckets.find((b) => b.type === "interest");
    if (!bucket) {
      bucket = { period: 1, due: terms.due_date ?? terms.start_date, type: "interest", amount: 0, remaining: 0 };
      buckets.push(bucket);
    }
    bucket.amount = round2(bucket.amount + interest);
    bucket.remaining = round2(bucket.remaining + interest);
    interestCharged += interest;
  }

  function accrueTo(date: string) {
    if (date <= cursor) return;
    if (!closed && P > EPS) {
      if (!periodic) {
        const interest = P * rate * daysBetween(cursor, date);
        let bucket = buckets.find((b) => b.type === "interest");
        if (!bucket) {
          bucket = { period: 1, due: terms.due_date ?? terms.start_date, type: "interest", amount: 0, remaining: 0 };
          buckets.push(bucket);
        }
        bucket.amount += interest;
        bucket.remaining += interest;
        interestCharged += interest;
      } else {
        accruing += (interestBase() * rate * daysBetween(cursor, date)) / standardLength(k);
      }
    }
    cursor = date;
  }

  /** Interest for the whole current period, if nothing else changes. */
  const fullPeriodInterest = () =>
    accruing + (P > EPS ? (interestBase() * rate * Math.max(0, daysBetween(cursor, dueOf(k)))) / standardLength(k) : 0);

  /** The principal that falls due in period `n` (capped at what is left to schedule). */
  function scheduledPrincipal(n: number): number {
    const unscheduled = round2(P - outstanding((b) => b.type === "principal"));
    if (unscheduled <= EPS || !term) return 0;
    if (n >= term) return unscheduled;
    if (terms.plan === "installments" && plan) return Math.min(plan.principalParts[n - 1] ?? 0, unscheduled);
    return 0;
  }

  function charge(period: number, due: string, type: BucketType, amount: number) {
    amount = round2(amount);
    if (amount <= EPS) return;
    buckets.push({ period, due, type, amount, remaining: amount });
    if (type === "interest") interestCharged += amount;
    if (type === "fee") feesCharged += amount;
  }

  /** Charges period k on its due date. */
  function post() {
    const due = dueOf(k);
    const interest = round2(accruing);
    accruing = 0;
    charge(k, due, "interest", interest);
    charge(k, due, "principal", scheduledPrincipal(k));
    if (terms.late_fee_type !== "none") lateChecks.push({ date: addDays(due, terms.grace_days + 1), period: k });
    k++;
    applyCredit();
  }

  /** Interest owed for the current period if the loan were paid off now, per the loan's rule. */
  const payoffInterest = () => (terms.early_payoff === "full_period" ? fullPeriodInterest() : accruing);

  /** Charges the current period's interest now, because the principal is gone. */
  function settleCurrentPeriod(date: string, amount: number) {
    accruing = 0;
    charge(k, date, "interest", amount);
  }

  function assessLateFee(period: number) {
    const unpaid = outstanding((b) => b.period === period && b.type !== "fee");
    const principalLate = !periodic ? P : 0;
    const base = round2(unpaid + principalLate);
    if (base <= EPS) return;
    const fee = terms.late_fee_type === "fixed" ? terms.late_fee_value : (base * terms.late_fee_value) / 100;
    const due = !periodic ? (terms.due_date ?? terms.start_date) : dueOf(period);
    charge(period, due, "fee", fee);
    applyCredit();
  }

  function reopen(date: string) {
    closed = false;
    if (periodic) {
      while (dueOf(k) <= date) k++;
    }
    cursor = date;
  }

  function apply(e: Entry, date: string) {
    const effect: EntryEffect = { fees: 0, interest: 0, principal: 0, credit: 0 };
    effects[e.id] = effect;
    let amount = round2(e.amount);

    if (e.kind === "disbursement") {
      if (closed) reopen(date);
      P = round2(P + amount);
      lent = round2(lent + amount);
      effect.principal = amount;
      chargeFlatInterest(amount);
      return;
    }
    if (e.kind === "fee") {
      charge(Math.max(1, k - 1), date, "fee", amount);
      effect.fees = amount;
      applyCredit();
      return;
    }
    if (e.kind === "waiver") {
      const before = amount;
      amount = payBuckets(amount, ["fee"], effect);
      amount = payBuckets(amount, ["interest"], effect);
      if (amount > EPS && accruing > EPS) {
        // Interest of the current period: count it as charged, then forgiven.
        const x = round2(Math.min(amount, accruing));
        accruing -= x;
        interestCharged += x;
        effect.interest = round2(effect.interest + x);
        amount = round2(amount - x);
      }
      amount = payBuckets(amount, ["principal"], effect);
      if (amount > EPS && P > EPS) {
        const x = round2(Math.min(amount, P));
        P = round2(P - x);
        effect.principal = round2(effect.principal + x);
        amount = round2(amount - x);
        if (P <= EPS && periodic) accruing = 0;
      }
      waived = round2(waived + before - amount);
      return;
    }

    // A payment.
    paid = round2(paid + amount);
    if (e.allocation === "interest") {
      amount = payBuckets(amount, ["interest"], effect);
    } else if (e.allocation === "principal") {
      amount = payBuckets(amount, ["principal"], effect);
      if (amount > EPS && P > EPS) {
        const x = round2(Math.min(amount, P));
        const periodInterest = periodic && x >= P - EPS ? payoffInterest() : 0;
        P = round2(P - x);
        effect.principal = round2(effect.principal + x);
        amount = round2(amount - x);
        // The principal is gone: this period's interest is still owed.
        if (periodic && P <= EPS) settleCurrentPeriod(date, periodInterest);
      }
    } else {
      amount = payBuckets(amount, ["fee", "interest", "principal"], effect);
      if (amount > EPS && P > EPS) {
        if (!periodic) {
          const x = round2(Math.min(amount, P));
          P = round2(P - x);
          effect.principal = round2(effect.principal + x);
          amount = round2(amount - x);
        } else {
          const periodInterest = payoffInterest();
          if (amount >= P + periodInterest - EPS) {
            // Pays the loan off.
            settleCurrentPeriod(date, periodInterest);
            amount = payBuckets(amount, ["interest"], effect);
            effect.principal = round2(effect.principal + P);
            amount = round2(amount - P);
            P = 0;
          } else {
            // Hold enough for the next charge, then reduce the principal (abono a capital).
            const nextCharge = fullPeriodInterest() + scheduledPrincipal(k);
            const hold = round2(Math.min(amount, Math.max(0, nextCharge - credit)));
            credit = round2(credit + hold);
            effect.credit = round2(effect.credit + hold);
            amount = round2(amount - hold);
            const x = round2(Math.min(amount, P));
            P = round2(P - x);
            effect.principal = round2(effect.principal + x);
            amount = round2(amount - x);
            if (P <= EPS) settleCurrentPeriod(date, accruing);
          }
        }
      }
    }
    if (amount > EPS) {
      credit = round2(credit + amount);
      effect.credit = round2(effect.credit + amount);
    }
  }

  function checkClosed(date: string) {
    if (!closed && lent > 0 && P <= EPS && outstanding() <= EPS && (!periodic || accruing <= EPS)) {
      closed = true;
      cursor = date;
    }
  }

  // Initial disbursement.
  P = round2(terms.principal);
  lent = P;
  chargeFlatInterest(P);
  if (!periodic && terms.due_date && terms.late_fee_type !== "none") {
    lateChecks.push({ date: addDays(terms.due_date, terms.grace_days + 1), period: 1 });
  }

  const sorted = [...entries].sort((a, b) => a.paid_on.localeCompare(b.paid_on) || a.id - b.id);
  let i = 0;
  for (let guard = 0; guard < 100_000; guard++) {
    const candidates: string[] = [];
    if (periodic && !closed && P > EPS) candidates.push(dueOf(k));
    for (const c of lateChecks) candidates.push(c.date);
    if (i < sorted.length) candidates.push(sorted[i].paid_on < terms.start_date ? terms.start_date : sorted[i].paid_on);
    if (!candidates.length) break;
    const date = candidates.reduce((a, b) => (b < a ? b : a));
    if (date > asOf) break;

    accrueTo(date);
    for (let j = lateChecks.length - 1; j >= 0; j--) {
      if (lateChecks[j].date <= date) {
        const [{ period }] = lateChecks.splice(j, 1);
        assessLateFee(period);
      }
    }
    if (periodic && !closed && P > EPS && dueOf(k) === date) post();
    while (i < sorted.length && (sorted[i].paid_on < terms.start_date ? terms.start_date : sorted[i].paid_on) === date) {
      apply(sorted[i], date);
      i++;
    }
    applyCredit();
    checkClosed(date);
  }
  accrueTo(asOf);

  // --- Where things stand on asOf ---
  for (const b of buckets) b.remaining = round2(b.remaining);
  const interestDue = round2(outstanding((b) => b.type === "interest"));
  const feesDue = round2(outstanding((b) => b.type === "fee"));
  const owedCharges = round2(outstanding());
  const currentCharge = periodic && !closed && P > EPS ? payoffInterest() : 0;
  const unscheduledP = round2(P - outstanding((b) => b.type === "principal"));
  const payoff = round2(owedCharges + unscheduledP + currentCharge - credit);
  const balance = Math.max(0, payoff);

  let dueNow: number;
  let overdue: number;
  if (periodic) {
    dueNow = owedCharges;
    overdue = round2(outstanding((b) => b.due < asOf));
  } else {
    const isDue = terms.due_date !== null && asOf >= terms.due_date;
    dueNow = isDue ? balance : feesDue;
    overdue = terms.due_date !== null && asOf > terms.due_date ? balance : 0;
  }

  const done = balance <= EPS && P <= EPS;
  const periodsBehind = periodic ? new Set(ordered().filter((b) => b.due < asOf).map((b) => b.period)).size : 0;

  let next: LoanSummary["next"] = null;
  const oldest = ordered()[0];
  if (done) {
    next = null;
  } else if (!periodic) {
    next = terms.due_date
      ? { date: terms.due_date, amount: balance, interest: round2(interestDue + feesDue), principal: round2(P) }
      : null;
  } else if (oldest) {
    const owedInterest = round2(interestDue + feesDue);
    next = { date: oldest.due, amount: owedCharges, interest: owedInterest, principal: round2(owedCharges - owedInterest) };
  } else if (P > EPS) {
    const interest = round2(fullPeriodInterest());
    const principal = round2(scheduledPrincipal(k));
    next = { date: dueOf(k), amount: Math.max(0, round2(interest + principal - credit)), interest, principal };
  }

  const maturityDate = !periodic ? terms.due_date : term ? dueOf(term) : null;
  const daysUntilDue = done ? null : next ? daysBetween(asOf, next.date) : null;
  const status = done ? "paid" : overdue > EPS ? "overdue" : "active";

  // --- Schedule (periodic plans) ---
  let schedule: ScheduleRow[] | null = null;
  if (periodic) {
    schedule = [];
    for (let n = 1; n < k; n++) {
      const rows = buckets.filter((b) => b.period === n);
      const sum = (t: BucketType) => round2(rows.filter((b) => b.type === t).reduce((s, b) => s + b.amount, 0));
      const total = round2(rows.reduce((s, b) => s + b.amount, 0));
      const left = round2(rows.reduce((s, b) => s + b.remaining, 0));
      const due = dueOf(n);
      schedule.push({
        number: n,
        dueDate: due,
        interest: sum("interest"),
        principal: sum("principal"),
        fees: sum("fee"),
        total,
        paid: round2(total - left),
        status: left <= EPS ? "paid" : due < asOf ? "overdue" : total - left > EPS ? "partial" : "due",
      });
    }
    // Upcoming periods, assuming each is paid on time.
    if (!done && P > EPS) {
      let projectedP = unscheduledP;
      const lastToShow = term ? term : k + 2;
      for (let n = k; n <= Math.max(lastToShow, k) && n < k + 120 && projectedP > EPS; n++) {
        const base = flat && (!term || n <= term) ? terms.principal : projectedP;
        const interest = round2(n === k ? fullPeriodInterest() : base * rate);
        let principal = 0;
        if (term && n >= term) principal = projectedP;
        else if (terms.plan === "installments" && plan) principal = Math.min(plan.principalParts[n - 1] ?? 0, projectedP);
        principal = round2(principal);
        projectedP = round2(projectedP - principal);
        schedule.push({
          number: n,
          dueDate: dueOf(n),
          interest,
          principal,
          fees: 0,
          total: round2(interest + principal),
          paid: 0,
          status: "upcoming",
        });
      }
    }
  }

  // --- The whole debt: principal plus the interest it's carrying ---
  // Interest-only: this period's interest (once a period's due date has passed, the
  // next one's). Installments: the interest of every installment left. One-time:
  // interest up to the due date.
  let pendingInterest = interestDue;
  if (!done && P > EPS) {
    if (terms.plan === "installments") {
      pendingInterest += (schedule ?? []).filter((r) => r.status === "upcoming").reduce((sum, r) => sum + r.interest, 0);
    } else if (periodic) {
      const chargedToday = k > 1 && dueOf(k - 1) === asOf;
      if (!chargedToday) pendingInterest += fullPeriodInterest();
    } else if (terms.due_date && terms.due_date > asOf) {
      pendingInterest += P * rate * daysBetween(asOf, terms.due_date);
    }
  }
  pendingInterest = round2(pendingInterest);
  const debtWithInterest = done ? 0 : Math.max(0, round2(P + feesDue + pendingInterest - credit));
  // Money paid in advance covers interest first, so only what's beyond it lowers the principal.
  const debtWithoutInterest = done ? 0 : Math.max(0, round2(P + feesDue - Math.max(0, credit - pendingInterest)));

  const interest = round2(interestCharged + (periodic ? accruing : 0));
  const totalDue = round2(lent + interest + feesCharged - waived);
  return {
    principalLeft: round2(P),
    interestDue,
    feesDue,
    dueNow: round2(dueNow),
    overdue: round2(overdue),
    payoff,
    credit: round2(credit),
    next,
    installment: plan ? plan.installment : null,
    maturityDate,
    periodsBehind,
    lent,
    interest,
    fees: round2(feesCharged),
    waived,
    paid,
    totalDue,
    balance,
    debtWithInterest,
    debtWithoutInterest,
    progress: done ? 1 : paid + balance > 0 ? Math.min(1, paid / (paid + balance)) : 0,
    status,
    daysUntilDue,
    schedule,
    effects,
  };
}
