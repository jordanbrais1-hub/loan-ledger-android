import Link from "next/link";
import { describeDue, formatDate, formatMoney } from "@/lib/format";
import { loanHref } from "@/lib/routes";
import type { LoanWithSummary } from "@/lib/types";
import { Card, DirectionBadge, ProgressBar, StatusBadge } from "./ui";

export function LoanList({ loans, showPerson = true }: { loans: LoanWithSummary[]; showPerson?: boolean }) {
  return (
    <Card className="divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
      {loans.map((loan) => {
        const s = loan.summary;
        const due = s.status === "paid" ? null : describeDue(s.daysUntilDue);
        return (
          <Link
            key={loan.id}
            href={loanHref(loan.id)}
            className="flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-800/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate font-medium">
                  {showPerson ? loan.person_name : loan.description || "Loan"}
                </span>
                <StatusBadge status={s.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <DirectionBadge direction={loan.direction} />
                {showPerson && loan.description && <span className="truncate">{loan.description}</span>}
                <span>{formatDate(loan.start_date)}</span>
                {due && (
                  <span className={s.status === "overdue" ? "font-medium text-amber-700 dark:text-amber-400" : ""}>
                    {due}
                  </span>
                )}
              </div>
              <div className="mt-2 max-w-xs">
                <ProgressBar value={s.progress} direction={loan.direction} />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums">{formatMoney(s.balance, loan.currency)}</p>
              <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                of {formatMoney(s.totalDue, loan.currency)}
              </p>
            </div>
          </Link>
        );
      })}
    </Card>
  );
}
