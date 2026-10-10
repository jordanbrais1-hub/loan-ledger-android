import "server-only";
import { query } from "./db";
import { summarizeLoan } from "./loan-math";
import type { Loan, LoanWithSummary, Payment, Person } from "./types";

const LOAN_COLUMNS = `
  l.id, l.person_id, p.name AS person_name, l.direction, l.principal, l.interest_rate,
  l.start_date, l.due_date, l.description, l.notes, l.created_at::text AS created_at
`;

async function attachSummaries(loans: Loan[]): Promise<LoanWithSummary[]> {
  if (loans.length === 0) return [];
  const payments = await query<Payment>(
    "SELECT id, loan_id, amount, paid_on, method, note FROM payments WHERE loan_id = ANY($1)",
    [loans.map((l) => l.id)],
  );
  const byLoan = new Map<number, Payment[]>();
  for (const p of payments) {
    const list = byLoan.get(p.loan_id) ?? [];
    list.push(p);
    byLoan.set(p.loan_id, list);
  }
  return loans.map((l) => ({ ...l, summary: summarizeLoan(l, byLoan.get(l.id) ?? []) }));
}

export async function getLoans(personId?: number): Promise<LoanWithSummary[]> {
  const loans = await query<Loan>(
    `SELECT ${LOAN_COLUMNS} FROM loans l JOIN people p ON p.id = l.person_id
     ${personId ? "WHERE l.person_id = $1" : ""}
     ORDER BY l.start_date DESC, l.id DESC`,
    personId ? [personId] : [],
  );
  return attachSummaries(loans);
}

export async function getLoan(id: number): Promise<LoanWithSummary | null> {
  const loans = await query<Loan>(
    `SELECT ${LOAN_COLUMNS} FROM loans l JOIN people p ON p.id = l.person_id WHERE l.id = $1`,
    [id],
  );
  const [loan] = await attachSummaries(loans);
  return loan ?? null;
}

export async function getPayments(loanId: number): Promise<Payment[]> {
  return query<Payment>(
    `SELECT id, loan_id, amount, paid_on, method, note FROM payments
     WHERE loan_id = $1 ORDER BY paid_on DESC, id DESC`,
    [loanId],
  );
}

export type RecentPayment = Payment & { person_name: string; direction: Loan["direction"] };

export async function getRecentPayments(limit = 5): Promise<RecentPayment[]> {
  return query<RecentPayment>(
    `SELECT pay.id, pay.loan_id, pay.amount, pay.paid_on, pay.method, pay.note,
            p.name AS person_name, l.direction
     FROM payments pay JOIN loans l ON l.id = pay.loan_id JOIN people p ON p.id = l.person_id
     ORDER BY pay.paid_on DESC, pay.id DESC LIMIT $1`,
    [limit],
  );
}

export async function getPeople(): Promise<Person[]> {
  return query<Person>("SELECT id, name, phone, email, notes FROM people ORDER BY lower(name)");
}

export async function getPerson(id: number): Promise<Person | null> {
  const [person] = await query<Person>(
    "SELECT id, name, phone, email, notes FROM people WHERE id = $1",
    [id],
  );
  return person ?? null;
}

/** Totals across a set of loans, split by direction. Paid-off loans count as zero. */
export function totals(loans: LoanWithSummary[]) {
  let owedToMe = 0;
  let iOwe = 0;
  for (const l of loans) {
    if (l.direction === "lent") owedToMe += l.summary.balance;
    else iOwe += l.summary.balance;
  }
  return { owedToMe, iOwe, net: owedToMe - iOwe };
}
