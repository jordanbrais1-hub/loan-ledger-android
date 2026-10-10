import type { Currency } from "./format";

export type Direction = "lent" | "borrowed";
export type LoanStatus = "active" | "overdue" | "paid";

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
  amount: number;
  paid_on: string;
  method: string | null;
  note: string | null;
}

export interface Loan {
  id: number;
  person_id: number;
  person_name: string;
  direction: Direction;
  currency: Currency;
  principal: number;
  interest_rate: number;
  start_date: string;
  due_date: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export interface LoanSummary {
  interest: number;
  paid: number;
  totalDue: number;
  balance: number;
  progress: number;
  status: LoanStatus;
  daysUntilDue: number | null;
}

export type LoanWithSummary = Loan & { summary: LoanSummary };

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
  /** The record that was created or saved, when an action produces one. */
  id?: number;
}
