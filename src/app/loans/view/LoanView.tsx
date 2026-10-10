"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PaymentForm } from "@/components/PaymentForm";
import { Card, DirectionBadge, Loading, NotFoundState, ProgressBar, StatusBadge, buttonClass } from "@/components/ui";
import { deleteLoan, deletePayment } from "@/lib/actions";
import { describeDue, formatDate, formatMoney } from "@/lib/format";
import { getLoan, getPayments } from "@/lib/queries";
import { editLoanHref, parseId, personHref } from "@/lib/routes";

export function LoanView() {
  const id = parseId(useSearchParams().get("id"));
  const router = useRouter();
  const data = useLiveQuery(() => (id ? Promise.all([getLoan(id), getPayments(id)]) : null), [id]);
  if (data === undefined) return <Loading />;
  const [loan, payments] = data ?? [null, []];
  if (!loan) return <NotFoundState />;

  const s = loan.summary;
  const lent = loan.direction === "lent";
  const due = s.status === "paid" ? null : describeDue(s.daysUntilDue);

  return (
    <>
      <Link
        href="/loans"
        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        &larr; Loans
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              <Link href={personHref(loan.person_id)} className="hover:underline">
                {loan.person_name}
              </Link>
            </h1>
            <StatusBadge status={s.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <DirectionBadge direction={loan.direction} />
            {loan.description && <span>{loan.description}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={editLoanHref(loan.id)} className={buttonClass.secondary}>
            Edit
          </Link>
          <ConfirmButton
            action={async () => {
              // Leave first, so this page doesn't flash "Not found" once the loan is gone.
              router.push("/loans");
              await deleteLoan(loan.id);
            }}
            title="Delete this loan?"
            message={`This permanently removes the loan with ${loan.person_name} and all ${payments.length} of its payments.`}
            className={buttonClass.ghostDanger}
          >
            Delete
          </ConfirmButton>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {s.status === "paid" ? "Fully paid" : lent ? "They still owe you" : "You still owe"}
            </p>
            <p
              className={`mt-1 text-4xl font-semibold tabular-nums ${
                s.status === "paid" || lent ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatMoney(s.balance, loan.currency)}
            </p>
            {due && (
              <p className={`mt-1 text-sm ${s.status === "overdue" ? "font-medium text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
                {due} ({formatDate(loan.due_date)})
              </p>
            )}
            <div className="mt-4">
              <ProgressBar value={s.progress} direction={loan.direction} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {Math.round(s.progress * 100)}% repaid
              </p>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Stat label={lent ? "Amount lent" : "Amount borrowed"} value={formatMoney(loan.principal, loan.currency)} />
              <Stat label="Interest" value={loan.interest_rate > 0 ? `${loan.interest_rate}% / year` : "None"} />
              <Stat label="Interest so far" value={formatMoney(s.interest, loan.currency)} />
              <Stat label="Total to repay" value={formatMoney(s.totalDue, loan.currency)} />
              <Stat label="Repaid" value={formatMoney(s.paid, loan.currency)} />
              <Stat label="Loan date" value={formatDate(loan.start_date)} />
              <Stat label="Due date" value={formatDate(loan.due_date)} />
            </dl>

            {loan.notes && (
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{loan.notes}</p>
              </div>
            )}
          </Card>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Payment history</h2>
            {payments.length === 0 ? (
              <Card className="p-5 text-sm text-slate-500 dark:text-slate-400">
                No payments yet. Record one when {lent ? "they pay you back" : "you pay them back"}.
              </Card>
            ) : (
              <Card className="divide-y divide-slate-200 dark:divide-slate-800">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium tabular-nums">{formatMoney(p.amount, loan.currency)}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(p.paid_on)}
                        {p.method && ` · ${p.method}`}
                        {p.note && ` · ${p.note}`}
                      </p>
                    </div>
                    <ConfirmButton
                      action={() => deletePayment(p.id)}
                      title="Delete this payment?"
                      message={`The ${formatMoney(p.amount, loan.currency)} payment from ${formatDate(p.paid_on)} will be removed and the balance recalculated.`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    >
                      Remove
                    </ConfirmButton>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>

        <aside>
          <Card className="p-5 lg:sticky lg:top-20">
            <h2 className="mb-4 font-semibold">Record a payment</h2>
            {s.status === "paid" && (
              <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                This loan is fully paid. You can still add a payment if you need to correct something.
              </p>
            )}
            <PaymentForm loanId={loan.id} balance={s.balance} currency={loan.currency} direction={loan.direction} />
          </Card>
        </aside>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
