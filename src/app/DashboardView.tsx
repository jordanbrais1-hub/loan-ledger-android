"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { DebtToggle, useDebtView } from "@/components/DebtToggle";
import { SampleDataButton } from "@/components/Demo";
import { LoanList } from "@/components/LoanList";
import { Card, EmptyState, Loading, PageHeader, StatCard, buttonClass } from "@/components/ui";
import { demoMode } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { amountLines, amountsSign, formatDate, formatMoney } from "@/lib/format";
import { getLoans, getRecentPayments, totals } from "@/lib/queries";
import { loanHref } from "@/lib/routes";

export function DashboardView() {
  const data = useLiveQuery(() => Promise.all([getLoans(), getRecentPayments(6)]), []);
  const view = useDebtView();
  if (!data) return <Loading />;
  const [loans, recentPayments] = data;

  if (loans.length === 0) {
    return (
      <>
        <PageHeader title={t("Welcome to your Loan Ledger")} subtitle={t("Your notebook for money you lend and borrow.")} />
        <EmptyState
          title={t("No loans yet")}
          message={t("Add your first loan — money you lent to someone, or money you borrowed. We'll keep track of payments, interest and due dates for you.")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/loans/new" className={buttonClass.primary}>
                {t("+ Add your first loan")}
              </Link>
              {demoMode && <SampleDataButton />}
            </div>
          }
        />
      </>
    );
  }

  const { owedToMe, iOwe, net } = totals(loans, view);
  const netSign = amountsSign(net);
  const open = loans.filter((l) => l.summary.status !== "paid");
  const overdue = open.filter((l) => l.summary.status === "overdue");
  const attention = open
    .filter((l) => l.summary.daysUntilDue !== null && l.summary.daysUntilDue <= 7)
    .sort((a, b) => (a.summary.daysUntilDue ?? 0) - (b.summary.daysUntilDue ?? 0));

  return (
    <>
      <PageHeader title={t("Dashboard")} subtitle={t("Where you stand right now.")} actions={<DebtToggle />} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("Owed to me")} value={amountLines(owedToMe)} tone="green" />
        <StatCard label={t("I owe")} value={amountLines(iOwe)} tone="red" />
        <StatCard
          label={t("Net position")}
          value={amountLines(net)}
          tone={netSign > 0 ? "green" : netSign < 0 ? "red" : "neutral"}
          hint={netSign > 0 ? t("In your favor") : netSign < 0 ? t("You owe more than you're owed") : t("Per currency")}
        />
        <StatCard
          label={t("Open loans")}
          value={String(open.length)}
          hint={overdue.length ? t("{n} overdue", { n: overdue.length }) : t("Nothing overdue")}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("Needs attention")}</h2>
            <Link href="/loans?status=open&sort=due" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              {t("All open loans")} &rarr;
            </Link>
          </div>
          {attention.length ? (
            <LoanList loans={attention} />
          ) : (
            <Card className="p-5 text-sm text-slate-500 dark:text-slate-400">
              {t("Nothing is overdue or due in the next 7 days.")}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("Recent payments")}</h2>
          <Card className="divide-y divide-slate-200 dark:divide-slate-800">
            {recentPayments.length === 0 && (
              <p className="p-5 text-sm text-slate-500 dark:text-slate-400">{t("No payments recorded yet.")}</p>
            )}
            {recentPayments.map((p) => (
              <Link
                key={p.id}
                href={loanHref(p.loan_id)}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.person_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.direction === "lent" ? t("Paid you") : t("You paid")} · {formatDate(p.paid_on)}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    p.direction === "lent" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {p.direction === "lent" ? "+" : "−"}
                  {formatMoney(p.amount, p.currency)}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
