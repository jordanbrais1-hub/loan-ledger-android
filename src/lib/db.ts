import Dexie, { type EntityTable } from "dexie";
import { DEFAULT_CURRENCY, type Currency } from "./format";

// Rows as stored on the device. `name_lower` backs the case-insensitive
// unique name rule that Postgres used to enforce with an index.
export interface PersonRow {
  id: number;
  name: string;
  name_lower: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface LoanRow {
  id: number;
  person_id: number;
  direction: "lent" | "borrowed";
  currency: Currency;
  principal: number;
  interest_rate: number;
  start_date: string;
  due_date: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: number;
  loan_id: number;
  amount: number;
  paid_on: string;
  method: string | null;
  note: string | null;
  created_at: string;
}

export type LedgerDB = Dexie & {
  people: EntityTable<PersonRow, "id">;
  loans: EntityTable<LoanRow, "id">;
  payments: EntityTable<PaymentRow, "id">;
};

function createLedger(name: string): LedgerDB {
  const db = new Dexie(name) as LedgerDB;
  db.version(1).stores({
    people: "++id, &name_lower",
    loans: "++id, person_id, start_date",
    payments: "++id, loan_id, paid_on",
  });
  // v2: each loan has its own currency. Loans saved before that get the default.
  db.version(2).upgrade((tx) =>
    tx.table("loans").toCollection().modify((loan) => {
      loan.currency ??= DEFAULT_CURRENCY;
    }),
  );
  return db;
}

let current: LedgerDB | null = null;

/**
 * Opens the ledger belonging to one signed-in account. Each account gets its
 * own on-device database, so two people sharing a phone never see each
 * other's loans.
 */
export async function openLedger(accountId: string): Promise<LedgerDB> {
  const name = `loan-ledger-${accountId}`;
  if (current?.name === name) return current;
  current?.close();
  current = createLedger(name);
  await current.open();
  // Ask the browser/WebView not to evict our data under storage pressure.
  await navigator.storage?.persist?.().catch(() => false);
  return current;
}

export function closeLedger() {
  current?.close();
  current = null;
}

/** The open ledger. Only call this inside the signed-in part of the app. */
export function db(): LedgerDB {
  if (!current) throw new Error("Ledger is not open — sign in first.");
  return current;
}

export const nowISO = () => new Date().toISOString();
