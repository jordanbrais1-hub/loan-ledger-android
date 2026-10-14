import { z } from "zod";
import { todayISO } from "./dates";
import { LEGACY_TERMS, db } from "./db";
import { CURRENCIES, DEFAULT_CURRENCY } from "./format";
import { saveFile } from "./files";
import { t } from "./i18n";
import { describePlan, describeRate } from "./plans";
import { getLoans } from "./queries";
import {
  ALLOCATIONS,
  AMORTIZATIONS,
  EARLY_PAYOFFS,
  ENTRY_KINDS,
  FREQUENCIES,
  LATE_FEE_TYPES,
  PLANS,
  RATE_PERIODS,
} from "./types";

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
      // Backups made before repayment plans existed get the old behaviour.
      plan: z.enum(PLANS).default(LEGACY_TERMS.plan),
      rate_period: z.enum(RATE_PERIODS).default(LEGACY_TERMS.rate_period),
      frequency: z.enum(FREQUENCIES).default(LEGACY_TERMS.frequency),
      first_due_date: nullableText.default(null),
      term: z.number().int().positive().nullable().default(null),
      amortization: z.enum(AMORTIZATIONS).default(LEGACY_TERMS.amortization),
      late_fee_type: z.enum(LATE_FEE_TYPES).default(LEGACY_TERMS.late_fee_type),
      late_fee_value: z.number().min(0).default(0),
      grace_days: z.number().int().min(0).default(0),
      early_payoff: z.enum(EARLY_PAYOFFS).default(LEGACY_TERMS.early_payoff),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.number().int(), loan_id: z.number().int(), amount: z.number().positive(), paid_on: z.string(),
      kind: z.enum(ENTRY_KINDS).default("payment"), allocation: z.enum(ALLOCATIONS).default("auto"),
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
    throw new Error(t("That file isn't a Loan Ledger backup."));
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) throw new Error(t("That file isn't a Loan Ledger backup, or it's damaged."));
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
    t("Person"), t("Direction"), t("Description"), t("Currency"), t("Amount lent"), t("Plan"), t("Interest rate"),
    t("Loan date"), t("Next due date"), t("Next amount"), t("Due now"), t("Principal left"), t("Interest so far"),
    t("Fees"), t("Repaid"), t("Payoff today"), t("Debt with interest"), t("Debt without interest"), t("Status"), t("Notes"),
  ];
  const statusNames = { active: t("Active"), overdue: t("Overdue"), paid: t("Paid off") };
  const rows = loans.map((l) => [
    l.person_name,
    l.direction === "lent" ? t("They owe me") : t("I owe them"),
    l.description,
    l.currency,
    l.summary.lent.toFixed(2),
    describePlan(l, l.summary),
    describeRate(l),
    l.start_date,
    l.summary.next?.date,
    l.summary.next?.amount.toFixed(2),
    l.summary.dueNow.toFixed(2),
    l.summary.principalLeft.toFixed(2),
    l.summary.interest.toFixed(2),
    l.summary.fees.toFixed(2),
    l.summary.paid.toFixed(2),
    l.summary.balance.toFixed(2),
    l.summary.debtWithInterest.toFixed(2),
    l.summary.debtWithoutInterest.toFixed(2),
    statusNames[l.summary.status],
    l.notes,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  await saveFile(`loan-ledger-${todayISO()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
}
