// Tests for the loan engine. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { addPeriods } from "./dates";
import { installmentPlan, summarizeLoan } from "./loan-math";
import type { Allocation, EntryKind, LoanTerms } from "./types";

const base: LoanTerms = {
  plan: "single", principal: 100000, interest_rate: 0, rate_period: "month", start_date: "2026-01-10",
  due_date: null, frequency: "monthly", first_due_date: null, term: null, amortization: "declining",
  late_fee_type: "none", late_fee_value: 0, grace_days: 0, early_payoff: "full_period",
};
let id = 1;
const pay = (paid_on: string, amount: number, allocation: Allocation = "auto", kind: EntryKind = "payment") => ({
  id: id++, kind, allocation, amount, paid_on,
});
const near = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 0.02, `${msg}: expected ${b}, got ${a}`);

test("dates: monthly keeps day, clamps month end", () => {
  assert.equal(addPeriods("2026-01-31", "monthly", 1), "2026-02-28");
  assert.equal(addPeriods("2026-01-31", "monthly", 2), "2026-03-31");
  assert.deepEqual([0, 1, 2, 3].map((n) => addPeriods("2026-01-15", "semimonthly", n)), ["2026-01-15", "2026-01-30", "2026-02-15", "2026-02-28"]);
  assert.deepEqual([0, 1, 2, 3].map((n) => addPeriods("2026-01-30", "semimonthly", n)), ["2026-01-30", "2026-02-15", "2026-02-28", "2026-03-15"]);
  assert.equal(addPeriods("2026-01-01", "biweekly", 1), "2026-01-15");
});

test("interest-only 10%/month: interest due each month, paying only interest rolls over", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 10 };
  let s = summarizeLoan(t, [], "2026-02-09");
  assert.equal(s.dueNow, 0);
  assert.equal(s.next!.date, "2026-02-10");
  near(s.next!.amount, 10000, "first month interest");
  s = summarizeLoan(t, [], "2026-02-10");
  near(s.dueNow, 10000, "due on due date");
  assert.equal(s.status, "active");
  s = summarizeLoan(t, [], "2026-02-11");
  assert.equal(s.status, "overdue");
  assert.equal(s.periodsBehind, 1);
  // Pays only interest on time → next month again 10,000, principal unchanged.
  const e = [pay("2026-02-10", 10000, "interest")];
  s = summarizeLoan(t, e, "2026-02-20");
  assert.equal(s.status, "active");
  near(s.principalLeft, 100000, "principal unchanged");
  assert.equal(s.next!.date, "2026-03-10");
  near(s.next!.amount, 10000, "next interest");
  near(s.effects[e[0].id].interest, 10000, "effect interest");
  // Three months unpaid → 30,000 due, 3 periods behind.
  s = summarizeLoan(t, [], "2026-05-11");
  near(s.dueNow, 40000, "four months due");
  assert.equal(s.periodsBehind, 4);
});

test("interest-only: paying interest a few days early is held as credit and covers the month", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 10 };
  const e = [pay("2026-02-05", 10000)];
  const s = summarizeLoan(t, e, "2026-02-15");
  near(s.dueNow, 0, "nothing due");
  near(s.credit, 0, "credit used");
  near(s.principalLeft, 100000, "principal untouched");
  assert.equal(s.status, "active");
  assert.equal(s.schedule![0].status, "paid");
});

test("interest-only: abono a capital lowers next month's interest", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 10 };
  const e = [pay("2026-02-10", 10000), pay("2026-02-10", 50000, "principal")];
  const s = summarizeLoan(t, e, "2026-02-11");
  near(s.principalLeft, 50000, "principal halved");
  near(s.next!.amount, 5000, "next interest halved");
  // Auto payment of 60,000 on the due date does the same: interest first, then principal (credit for next period held).
  const e2 = [pay("2026-02-10", 60000)];
  const s2 = summarizeLoan(t, e2, "2026-02-11");
  near(s2.effects[e2[0].id].interest, 10000, "interest part");
  near(s2.effects[e2[0].id].principal + s2.effects[e2[0].id].credit, 50000, "rest");
});

test("interest-only: payoff mid-month charges full month or prorated", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 10 };
  const e = [pay("2026-02-10", 10000)];
  let s = summarizeLoan(t, e, "2026-02-25");
  near(s.payoff, 110000, "full period payoff");
  const e2 = [...e, pay("2026-02-25", s.payoff)];
  s = summarizeLoan(t, e2, "2026-03-20");
  assert.equal(s.status, "paid");
  near(s.balance, 0, "closed");
  near(s.paid, 120000, "paid total");
  const tp: LoanTerms = { ...t, early_payoff: "prorated" };
  s = summarizeLoan(tp, e, "2026-02-25");
  near(s.payoff, 100000 + 10000 * 15 / 28, "prorated payoff");
});

test("interest-only with 6-month term: principal due at the end", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 5, term: 6 };
  const s = summarizeLoan(t, [], "2026-01-11");
  assert.equal(s.maturityDate, "2026-07-10");
  const last = s.schedule![s.schedule!.length - 1];
  assert.equal(last.number, 6);
  near(last.principal, 100000, "balloon");
  near(last.interest, 5000, "interest");
});

test("installments declining: 12 x 10% month", () => {
  const plan = installmentPlan(100000, 0.1, 12, "declining");
  near(plan.installment, 14676.33, "installment");
  const t: LoanTerms = { ...base, plan: "installments", interest_rate: 10, term: 12 };
  // Pay every installment on time → paid off after 12.
  const e: ReturnType<typeof pay>[] = [];
  for (let n = 0; n < 12; n++) e.push(pay(addPeriods("2026-02-10", "monthly", n), 0));
  let s = summarizeLoan(t, [], "2026-02-10");
  near(s.dueNow, 14676.33, "first installment");
  // fill amounts with the due amount each time
  const real: ReturnType<typeof pay>[] = [];
  for (const p of e) {
    const st = summarizeLoan(t, real, p.paid_on);
    real.push({ ...p, amount: st.dueNow });
  }
  s = summarizeLoan(t, real, "2027-02-11");
  assert.equal(s.status, "paid");
  assert.ok(Math.abs(s.paid - plan.installment * 12) < 0.1, "total paid within cents of 12 installments");
});

test("installments: missed one → overdue with late fee after grace", () => {
  const t: LoanTerms = { ...base, plan: "installments", interest_rate: 10, term: 12, late_fee_type: "percent", late_fee_value: 5, grace_days: 3 };
  let s = summarizeLoan(t, [], "2026-02-13");
  near(s.feesDue, 0, "no fee within grace");
  s = summarizeLoan(t, [], "2026-02-14");
  near(s.feesDue, 14676.33 * 0.05, "5% late fee");
  assert.equal(s.status, "overdue");
  // Paying everything clears it.
  const e = [pay("2026-02-14", s.dueNow)];
  s = summarizeLoan(t, e, "2026-02-15");
  assert.equal(s.status, "active");
  near(s.dueNow, 0, "clear");
});

test("installments flat: interest on original amount", () => {
  const t: LoanTerms = { ...base, plan: "installments", interest_rate: 5, term: 10, amortization: "flat" };
  const s = summarizeLoan(t, [], "2026-01-11");
  near(s.installment!, 15000, "10,000 principal + 5,000 interest");
  near(s.schedule![1].interest, 5000, "flat interest later");
});

test("single loan: annual interest, due date, fixed late fee", () => {
  const t: LoanTerms = { ...base, interest_rate: 12, rate_period: "year", due_date: "2026-02-10", late_fee_type: "fixed", late_fee_value: 2000 };
  let s = summarizeLoan(t, [], "2026-02-10");
  near(s.interest, 100000 * 0.12 / 365 * 31, "31 days interest");
  assert.equal(s.status, "active");
  s = summarizeLoan(t, [], "2026-02-11");
  assert.equal(s.status, "overdue");
  near(s.feesDue, 2000, "late fee");
  const e = [pay("2026-02-11", s.payoff)];
  s = summarizeLoan(t, e, "2026-03-01");
  assert.equal(s.status, "paid");
});

test("single loan with no interest: unchanged old behaviour", () => {
  const e = [pay("2026-01-20", 30000)];
  const s = summarizeLoan(base, e, "2026-02-01");
  near(s.balance, 70000, "balance");
  assert.equal(s.status, "active");
  assert.equal(s.daysUntilDue, null);
});

test("lend more and forgive", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 10 };
  const e = [pay("2026-02-10", 10000), pay("2026-02-10", 50000, "auto", "disbursement")];
  let s = summarizeLoan(t, e, "2026-02-11");
  near(s.principalLeft, 150000, "after lending more");
  near(s.next!.amount, 15000, "interest on 150k");
  near(s.lent, 150000, "lent");
  const e2 = [...e, pay("2026-03-10", 15000, "auto", "waiver")];
  s = summarizeLoan(t, e2, "2026-03-11");
  near(s.dueNow, 0, "forgiven month");
  near(s.waived, 15000, "waived");
  near(s.paid, 10000, "waiver is not a payment");
  near(s.totalDue, 150000 + 25000 - 15000 + 150000 * 0.1 / 31, "total due incl. 1 day of the current month");
});

test("biweekly / semimonthly period rates", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 10, frequency: "semimonthly", first_due_date: "2026-01-25" };
  const s = summarizeLoan(t, [], "2026-01-26");
  // first period 15 days vs a standard half month (Jan 10 → Jan 25 = 15 days)
  near(s.schedule![0].interest, 5000, "half a month of 10%");
  assert.equal(s.schedule![1].dueDate, "2026-02-10");
});

test("whole debt: interest-only 20%/month shows 120,000 until the interest is paid", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 20 };
  let s = summarizeLoan(t, [], "2026-01-10");
  near(s.debtWithInterest, 120000, "on the loan date");
  near(s.debtWithoutInterest, 100000, "without interest");
  s = summarizeLoan(t, [], "2026-02-10");
  near(s.debtWithInterest, 120000, "on the due date, unpaid");
  // Pays only the interest: still owes the same 100,000.
  const e = [pay("2026-02-10", 20000, "interest")];
  s = summarizeLoan(t, e, "2026-02-10");
  near(s.debtWithInterest, 100000, "right after paying the interest");
  near(s.debtWithoutInterest, 100000, "principal unchanged");
  // Next month's interest counts from the day after.
  s = summarizeLoan(t, e, "2026-02-11");
  near(s.debtWithInterest, 120000, "next month");
  // Unpaid month plus the current one.
  s = summarizeLoan(t, [], "2026-02-11");
  near(s.debtWithInterest, 140000, "one month overdue + current month");
  near(s.debtWithoutInterest, 100000, "without interest, overdue");
});

test("whole debt: paid in advance, abono a capital, payoff", () => {
  const t: LoanTerms = { ...base, plan: "interest_only", interest_rate: 20 };
  let s = summarizeLoan(t, [pay("2026-02-01", 20000)], "2026-02-01");
  near(s.debtWithInterest, 100000, "interest paid early");
  near(s.debtWithoutInterest, 100000, "credit doesn't lower the principal");
  s = summarizeLoan(t, [pay("2026-01-20", 30000, "principal")], "2026-01-20");
  near(s.debtWithoutInterest, 70000, "abono a capital");
  s = summarizeLoan(t, [pay("2026-01-20", 120000)], "2026-01-25");
  assert.equal(s.status, "paid");
  assert.equal(s.debtWithInterest, 0);
  assert.equal(s.debtWithoutInterest, 0);
});

test("whole debt: installments count every installment left", () => {
  const t: LoanTerms = { ...base, plan: "installments", interest_rate: 10, term: 12 };
  let s = summarizeLoan(t, [], "2026-01-10");
  // The last installment absorbs rounding, so allow a few cents.
  assert.ok(Math.abs(s.debtWithInterest - s.installment! * 12) < 0.1, "all 12 installments");
  near(s.debtWithoutInterest, 100000, "principal only");
  s = summarizeLoan(t, [pay("2026-02-10", s.installment!)], "2026-02-10");
  assert.ok(Math.abs(s.debtWithInterest - s.installment! * 11) < 0.1, "11 left");
});

test("whole debt: one-time loan counts interest up to the due date", () => {
  const t: LoanTerms = { ...base, interest_rate: 12, rate_period: "year", due_date: "2026-02-10" };
  const s = summarizeLoan(t, [], "2026-01-10");
  near(s.debtWithInterest, 100000 + (100000 * 0.12 * 31) / 365, "principal + 31 days");
  near(s.debtWithoutInterest, 100000, "principal only");
});
