import { db, type LoanRow, type PersonRow } from "./db";
import { zeroAmounts } from "./format";
import { summarizeLoan } from "./loan-math";
import type { Loan, LoanWithSummary, Payment, Person } from "./types";

const toPerson = ({ id, name, phone, email, notes }: PersonRow): Person => ({ id, name, phone, email, notes });

const toPayment = ({ id, loan_id, amount, paid_on, method, note }: Payment): Payment => ({
  id, loan_id, amount, paid_on, method, note,
});

function toLoan(row: LoanRow, personName: string): Loan {
  const { id, person_id, direction, currency, principal, interest_rate, start_date, due_date, description, notes, created_at } = row;
  return {
    id, person_id, person_name: personName, direction, currency, principal, interest_rate,
    start_date, due_date, description, notes, created_at,
  };
}

/** Newest loans first, matching the old `ORDER BY start_date DESC, id DESC`. */
const byStartDesc = (a: LoanRow, b: LoanRow) => b.start_date.localeCompare(a.start_date) || b.id - a.id;
/** Newest payments first, matching `ORDER BY paid_on DESC, id DESC`. */
const byPaidDesc = (a: Payment, b: Payment) => b.paid_on.localeCompare(a.paid_on) || b.id - a.id;

async function attachSummaries(rows: LoanRow[]): Promise<LoanWithSummary[]> {
  if (rows.length === 0) return [];
  const personIds = [...new Set(rows.map((l) => l.person_id))];
  const [people, payments] = await Promise.all([
    db().people.bulkGet(personIds),
    db().payments.where("loan_id").anyOf(rows.map((l) => l.id)).toArray(),
  ]);
  const names = new Map(people.filter((p) => p).map((p) => [p!.id, p!.name]));
  const byLoan = new Map<number, Payment[]>();
  for (const p of payments) {
    const list = byLoan.get(p.loan_id) ?? [];
    list.push(p);
    byLoan.set(p.loan_id, list);
  }
  return rows.map((row) => {
    const loan = toLoan(row, names.get(row.person_id) ?? "Unknown");
    return { ...loan, summary: summarizeLoan(loan, byLoan.get(row.id) ?? []) };
  });
}

export async function getLoans(personId?: number): Promise<LoanWithSummary[]> {
  const rows = personId
    ? await db().loans.where("person_id").equals(personId).toArray()
    : await db().loans.toArray();
  return attachSummaries(rows.sort(byStartDesc));
}

export async function getLoan(id: number): Promise<LoanWithSummary | null> {
  const row = await db().loans.get(id);
  if (!row) return null;
  const [loan] = await attachSummaries([row]);
  return loan;
}

export async function getPayments(loanId: number): Promise<Payment[]> {
  const rows = await db().payments.where("loan_id").equals(loanId).toArray();
  return rows.map(toPayment).sort(byPaidDesc);
}

export type RecentPayment = Payment & { person_name: string; direction: Loan["direction"]; currency: Loan["currency"] };

export async function getRecentPayments(limit = 5): Promise<RecentPayment[]> {
  const recent = (await db().payments.toArray()).sort(byPaidDesc).slice(0, limit);
  const loans = await db().loans.bulkGet([...new Set(recent.map((p) => p.loan_id))]);
  const loanById = new Map(loans.filter((l) => l).map((l) => [l!.id, l!]));
  const people = await db().people.bulkGet([...new Set([...loanById.values()].map((l) => l.person_id))]);
  const nameById = new Map(people.filter((p) => p).map((p) => [p!.id, p!.name]));
  return recent.flatMap((p) => {
    const loan = loanById.get(p.loan_id);
    if (!loan) return [];
    return [{ ...toPayment(p), person_name: nameById.get(loan.person_id) ?? "Unknown", direction: loan.direction, currency: loan.currency }];
  });
}

export async function getPeople(): Promise<Person[]> {
  const rows = await db().people.toArray();
  return rows.sort((a, b) => a.name_lower.localeCompare(b.name_lower)).map(toPerson);
}

export async function getPerson(id: number): Promise<Person | null> {
  const row = await db().people.get(id);
  return row ? toPerson(row) : null;
}

/**
 * Totals across a set of loans, split by direction and kept separate per
 * currency (there's no exchange rate to combine them). Paid-off loans count as zero.
 */
export function totals(loans: LoanWithSummary[]) {
  const owedToMe = zeroAmounts();
  const iOwe = zeroAmounts();
  for (const l of loans) {
    if (l.direction === "lent") owedToMe[l.currency] += l.summary.balance;
    else iOwe[l.currency] += l.summary.balance;
  }
  const net = zeroAmounts();
  for (const c of Object.keys(net) as (keyof typeof net)[]) net[c] = owedToMe[c] - iOwe[c];
  return { owedToMe, iOwe, net };
}
