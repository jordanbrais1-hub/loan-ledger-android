"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoanFilters } from "@/components/LoanFilters";
import { LoanList } from "@/components/LoanList";
import { EmptyState, Loading, PageHeader, buttonClass } from "@/components/ui";
import { exportLoansCsv } from "@/lib/backup";
import { formatAmounts } from "@/lib/format";
import { getLoans, totals } from "@/lib/queries";
import type { LoanWithSummary } from "@/lib/types";

type Search = { q?: string; status?: string; direction?: string; sort?: string };

function applyFilters(loans: LoanWithSummary[], { q, status, direction, sort }: Search) {
  const needle = q?.trim().toLowerCase();
  const filtered = loans.filter((l) => {
    if (direction && l.direction !== direction) return false;
    if (status === "open" && l.summary.status === "paid") return false;
    if (status && status !== "open" && l.summary.status !== status) return false;
    if (needle) {
      const haystack = [l.person_name, l.description, l.notes].join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  if (sort === "oldest") filtered.reverse();
  if (sort === "balance") filtered.sort((a, b) => b.summary.balance - a.summary.balance);
  if (sort === "due") {
    // Loans without a due date go last.
    filtered.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  }
  return filtered;
}

export function LoansView() {
  const params = useSearchParams();
  const allLoans = useLiveQuery(() => getLoans(), []);
  const [exporting, setExporting] = useState(false);
  if (!allLoans) return <Loading />;

  const search: Search = Object.fromEntries(params.entries());
  const loans = applyFilters(allLoans, search);
  const { owedToMe, iOwe } = totals(loans);

  return (
    <>
      <PageHeader
        title="Loans"
        subtitle={`${allLoans.length} loan${allLoans.length === 1 ? "" : "s"} in your ledger`}
        actions={
          allLoans.length > 0 && (
            <button
              type="button"
              className={buttonClass.secondary}
              disabled={exporting}
              onClick={() => {
                setExporting(true);
                exportLoansCsv()
                  .catch((e) => console.error(e))
                  .finally(() => setExporting(false));
              }}
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          )
        }
      />

      {allLoans.length === 0 ? (
        <EmptyState
          title="No loans yet"
          message="When you lend or borrow money, add it here so you never lose track."
          action={
            <Link href="/loans/new" className={buttonClass.primary}>
              + Add a loan
            </Link>
          }
        />
      ) : (
        <>
          <LoanFilters />
          {loans.length === 0 ? (
            <EmptyState title="No matches" message="No loans match these filters. Try clearing the search or picking another tab." />
          ) : (
            <>
              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                Showing {loans.length} · Owed to me{" "}
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatAmounts(owedToMe)}</span> · I owe{" "}
                <span className="font-medium text-rose-600 dark:text-rose-400">{formatAmounts(iOwe)}</span>
              </p>
              <LoanList loans={loans} />
            </>
          )}
        </>
      )}
    </>
  );
}
