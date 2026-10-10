import { z } from "zod";
import { todayISO } from "./dates";
import { db } from "./db";
import { CURRENCIES, DEFAULT_CURRENCY } from "./format";
import { saveFile } from "./files";
import { getLoans } from "./queries";

// Everything lives on this one device, so backups are how data survives a lost
// phone or moves to a new one.

const nullableText = z.string().nullable();
const backupSchema = z.object({
  app: z.literal("loan-ledger"),
  version: z.literal(1),
  people: z.array(
    z.object({
      id: z.number().int(), name: z.string().min(1), phone: nullableText, email: nullableText,
      notes: nullableText, created_at: z.string(),
    }),
  ),
  loans: z.array(
    z.object({
      id: z.number().int(), person_id: z.number().int(), direction: z.enum(["lent", "borrowed"]),
      // Backups made before loans had a currency don't include it.
      currency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
      principal: z.number().positive(), interest_rate: z.number().min(0), start_date: z.string(),
      due_date: nullableText, description: nullableText, notes: nullableText,
      created_at: z.string(), updated_at: z.string(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.number().int(), loan_id: z.number().int(), amount: z.number().positive(), paid_on: z.string(),
      method: nullableText, note: nullableText, created_at: z.string(),
    }),
  ),
});

export async function exportBackup() {
  const [people, loans, payments] = await Promise.all([
    db().people.toArray(),
    db().loans.toArray(),
    db().payments.toArray(),
  ]);
  const backup = {
    app: "loan-ledger",
    version: 1,
    exportedAt: new Date().toISOString(),
    people: people.map(({ id, name, phone, email, notes, created_at }) => ({ id, name, phone, email, notes, created_at })),
    loans,
    payments,
  };
  await saveFile(`loan-ledger-backup-${todayISO()}.json`, JSON.stringify(backup, null, 2), "application/json");
}

/** Replaces everything in the open ledger with the contents of a backup file. */
export async function importBackup(text: string): Promise<{ loans: number }> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Loan Ledger backup.");
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) throw new Error("That file isn't a Loan Ledger backup, or it's damaged.");
  const { people, loans, payments } = parsed.data;

  await db().transaction("rw", db().people, db().loans, db().payments, async () => {
    await Promise.all([db().people.clear(), db().loans.clear(), db().payments.clear()]);
    await db().people.bulkAdd(people.map((p) => ({ ...p, name_lower: p.name.toLowerCase() })));
    await db().loans.bulkAdd(loans);
    await db().payments.bulkAdd(payments);
  });
  return { loans: loans.length };
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Shares every loan, with its current balance, as a CSV spreadsheet. */
export async function exportLoansCsv() {
  const loans = await getLoans();
  const header = [
    "Person", "Direction", "Description", "Currency", "Amount", "Interest % / year", "Loan date", "Due date",
    "Interest so far", "Repaid", "Balance", "Status", "Notes",
  ];
  const rows = loans.map((l) => [
    l.person_name,
    l.direction === "lent" ? "They owe me" : "I owe them",
    l.description,
    l.currency,
    l.principal.toFixed(2),
    l.interest_rate,
    l.start_date,
    l.due_date,
    l.summary.interest.toFixed(2),
    l.summary.paid.toFixed(2),
    l.summary.balance.toFixed(2),
    l.summary.status,
    l.notes,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  await saveFile(`loan-ledger-${todayISO()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
}
