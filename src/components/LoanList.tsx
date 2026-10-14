"use client";

import Link from "next/link";
import { debtOf } from "@/lib/debt-view";
import { describeDue, formatDate, formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { planName } from "@/lib/plans";
import { loanHref } from "@/lib/routes";
import type { LoanWithSummary } from "@/lib/types";
import { useDebtView } from "./DebtToggle";
import { Card, DirectionBadge, ProgressBar, StatusBadge } from "./ui";

export function LoanList({ loans, showPerson = true }: { loans: LoanWithSummary[]; showPerson?: boolean }) {
  const view = useDebtView();
  return (
    <Card className="divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
      {loans.map((loan) => {
        const s = loan.summary;
        const due = s.status === "paid" ? null : describeDue(s.daysUntilDue);
        const periodic = loan.plan !== "single";
        // For periodic loans, the next payment matters more than the total.
        const nextAmount = s.status === "paid" ? null : s.dueNow > 0.005 ? s.dueNow : periodic ? (s.next?.amount ?? null) : null;
        return (
          <Link
            key={loan.id}
            href={loanHref(loan.id)}
            className="flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-800/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate font-medium">
                  {showPerson ? loan.person_name : loan.description || t("Loan")}
                </span>
                <StatusBadge status={s.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <DirectionBadge direction={loan.direction} />
                {periodic && <span>{planName(loan.plan)}</span>}
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
              <p className="font-semibold tabular-nums">{formatMoney(debtOf(s, view), loan.currency)}</p>
              <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {nextAmount !== null && periodic
                  ? s.dueNow > 0.005
                    ? t("due now {amount}", { amount: formatMoney(nextAmount, loan.currency) })
                    : t("next {amount}", { amount: formatMoney(nextAmount, loan.currency) })
                  : view === "with"
                    ? t("with interest")
                    : t("without interest")}
              </p>
            </div>
          </Link>
        );
      })}
    </Card>
  );
}
