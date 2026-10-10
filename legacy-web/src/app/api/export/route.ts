import { todayISO } from "@/lib/dates";
import { getLoans } from "@/lib/queries";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Downloads every loan, with its current balance, as a CSV spreadsheet. */
export async function GET() {
  const loans = await getLoans();
  const header = [
    "Person", "Direction", "Description", "Amount", "Interest % / year", "Loan date", "Due date",
    "Interest so far", "Repaid", "Balance", "Status", "Notes",
  ];
  const rows = loans.map((l) => [
    l.person_name,
    l.direction === "lent" ? "They owe me" : "I owe them",
    l.description,
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

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="loan-ledger-${todayISO()}.csv"`,
    },
  });
}
