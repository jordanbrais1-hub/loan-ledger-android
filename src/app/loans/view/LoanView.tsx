"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EntryForm } from "@/components/EntryForm";
import { Card, DirectionBadge, Loading, NotFoundState, ProgressBar, StatusBadge, buttonClass } from "@/components/ui";
import { deleteLoan, deletePayment } from "@/lib/actions";
import { describeDue, formatDate, formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { describeLateFee, describePlan, describeRate } from "@/lib/plans";
import { getLoan, getPayments } from "@/lib/queries";
import { editLoanHref, parseId, personHref } from "@/lib/routes";
import type { EntryEffect, LoanWithSummary, Payment, ScheduleRow, ScheduleStatus } from "@/lib/types";

export function LoanView() {
  const id = parseId(useSearchParams().get("id"));
  const router = useRouter();
  const data = useLiveQuery(() => (id ? Promise.all([getLoan(id), getPayments(id)]) : null), [id]);
  if (data === undefined) return <Loading />;
  const [loan, payments] = data ?? [null, []];
  if (!loan) return <NotFoundState />;

  const s = loan.summary;
  const lent = loan.direction === "lent";
  const money = (n: number) => formatMoney(n, loan.currency);
  const lateFee = describeLateFee(loan);

  return (
    <>
      <Link
        href="/loans"
        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        &larr; {t("Loans")}
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
            <span>{describePlan(loan, s)}</span>
            {loan.description && <span>· {loan.description}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={editLoanHref(loan.id)} className={buttonClass.secondary}>
            {t("Edit")}
          </Link>
          <ConfirmButton
            action={async () => {
              // Leave first, so this page doesn't flash "Not found" once the loan is gone.
              router.push("/loans");
              await deleteLoan(loan.id);
            }}
            title={t("Delete this loan?")}
            message={t("This permanently removes the loan with {name} and all {n} of its records.", {
              name: loan.person_name,
              n: payments.length,
            })}
            className={buttonClass.ghostDanger}
          >
            {t("Delete")}
          </ConfirmButton>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <Headline loan={loan} />

            <div className="mt-4">
              <ProgressBar value={s.progress} direction={loan.direction} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("{pct}% repaid", { pct: Math.round(s.progress * 100) })}</p>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Stat label={lent ? t("Amount lent") : t("Amount borrowed")} value={money(s.lent)} />
              <Stat label={t("Principal left")} value={money(s.principalLeft)} />
              <Stat label={t("Pay off today")} value={money(s.balance)} />
              <Stat label={t("Interest")} value={describeRate(loan)} />
              <Stat label={t("Interest so far")} value={money(s.interest)} />
              <Stat label={t("Repaid")} value={money(s.paid)} />
              {s.installment !== null && <Stat label={t("Installment")} value={money(s.installment)} />}
              {s.fees > 0 && <Stat label={t("Fees charged")} value={money(s.fees)} />}
              {s.waived > 0 && <Stat label={t("Forgiven")} value={money(s.waived)} />}
              {s.credit > 0.005 && <Stat label={s.status === "paid" ? t("Overpaid") : t("Paid in advance")} value={money(s.credit)} />}
              <Stat label={t("Loan date")} value={formatDate(loan.start_date)} />
              <Stat label={loan.plan === "single" ? t("Due date") : t("Final payment")} value={formatDate(s.maturityDate)} />
              {lateFee && <Stat label={t("Late fee")} value={lateFee} />}
            </dl>

            {loan.notes && (
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("Notes")}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{loan.notes}</p>
              </div>
            )}
          </Card>

          {s.schedule && s.schedule.length > 0 && <Schedule rows={s.schedule} money={money} />}

          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("History")}</h2>
            {payments.length === 0 ? (
              <Card className="p-5 text-sm text-slate-500 dark:text-slate-400">
                {lent
                  ? t("Nothing recorded yet. Record a payment when they pay you.")
                  : t("Nothing recorded yet. Record a payment when you pay them.")}
              </Card>
            ) : (
              <Card className="divide-y divide-slate-200 dark:divide-slate-800">
                {payments.map((p) => (
                  <HistoryRow key={p.id} entry={p} effect={s.effects[p.id]} money={money} />
                ))}
              </Card>
            )}
          </section>
        </div>

        <aside>
          <Card className="p-5 lg:sticky lg:top-20">
            <h2 className="mb-4 font-semibold">{t("Record")}</h2>
            {s.status === "paid" && (
              <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {t("This loan is fully paid. You can still record something if you need to correct it.")}
              </p>
            )}
            <EntryForm loan={loan} summary={s} />
          </Card>
        </aside>
      </div>
    </>
  );
}

/** The most useful number first: what's due now, otherwise the next payment, otherwise what's still owed. */
function Headline({ loan }: { loan: LoanWithSummary }) {
  const s = loan.summary;
  const money = (n: number) => formatMoney(n, loan.currency);
  const lent = loan.direction === "lent";
  const tone = (good: boolean) => (good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400");
  const big = "mt-1 text-4xl font-semibold tabular-nums";

  if (s.status === "paid") {
    return (
      <>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("Fully paid")}</p>
        <p className={`${big} ${tone(true)}`}>{money(0)}</p>
      </>
    );
  }

  const periodic = loan.plan !== "single";
  if (periodic && s.dueNow > 0.005) {
    return (
      <>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {s.overdue > 0.005 ? (lent ? t("Overdue — they owe now") : t("Overdue — you owe now")) : t("Due today")}
        </p>
        <p className={`${big} ${s.overdue > 0.005 ? "text-amber-600 dark:text-amber-400" : tone(lent)}`}>{money(s.dueNow)}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {s.periodsBehind > 1 ? `${t("{n} payments behind", { n: s.periodsBehind })} · ` : ""}
          {describeDue(s.daysUntilDue)} · {t("{amount} to pay it all off", { amount: money(s.balance) })}
        </p>
      </>
    );
  }
  if (periodic && s.next) {
    return (
      <>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("Next payment")} · {formatDate(s.next.date)}</p>
        <p className={`${big} ${tone(lent)}`}>{money(s.next.amount)}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {describeDue(s.daysUntilDue)}
          {s.next.principal > 0.005
            ? ` · ${t("{interest} interest + {principal} principal", { interest: money(s.next.interest), principal: money(s.next.principal) })}`
            : ` · ${t("interest only")}`}
          {s.credit > 0.005 ? ` · ${t("{amount} already paid in advance", { amount: money(s.credit) })}` : ""}
        </p>
      </>
    );
  }
  const due = describeDue(s.daysUntilDue);
  return (
    <>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lent ? t("They still owe you") : t("You still owe")}</p>
      <p className={`${big} ${tone(lent)}`}>{money(s.balance)}</p>
      {due && (
        <p
          className={`mt-1 text-sm ${s.status === "overdue" ? "font-medium text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}
        >
          {due} ({formatDate(loan.due_date)})
        </p>
      )}
    </>
  );
}

const scheduleStatus = (): Record<ScheduleStatus, { label: string; className: string }> => ({
  paid: { label: t("Paid"), className: "text-emerald-700 dark:text-emerald-400" },
  partial: { label: t("Part paid"), className: "text-sky-700 dark:text-sky-300" },
  overdue: { label: t("Overdue"), className: "font-medium text-amber-700 dark:text-amber-400" },
  due: { label: t("Due"), className: "font-medium text-slate-900 dark:text-white" },
  upcoming: { label: t("Upcoming"), className: "text-slate-400 dark:text-slate-500" },
});

function Schedule({ rows, money }: { rows: ScheduleRow[]; money: (n: number) => string }) {
  const [showAll, setShowAll] = useState(false);
  // Long-running loans: show the recent past and what's coming, unless asked for everything.
  const firstOpen = rows.findIndex((r) => r.status !== "paid");
  const start = showAll ? 0 : Math.max(0, (firstOpen === -1 ? rows.length : firstOpen) - 3);
  const visible = showAll ? rows : rows.slice(start, start + 9);
  const anyPrincipal = rows.some((r) => r.principal > 0);
  const anyFees = rows.some((r) => r.fees > 0);
  const statuses = scheduleStatus();

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("Payment schedule")}</h2>
        {rows.length > visible.length || showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {showAll ? t("Show less") : t("Show all {n}", { n: rows.length })}
          </button>
        ) : null}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">{t("Due date")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("Interest")}</th>
              {anyPrincipal && <th className="px-3 py-2 text-right font-medium">{t("Principal")}</th>}
              {anyFees && <th className="px-3 py-2 text-right font-medium">{t("Fees")}</th>}
              <th className="px-3 py-2 text-right font-medium">{t("Total")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
            {visible.map((r) => {
              const st = statuses[r.status];
              return (
                <tr key={r.number} className={r.status === "upcoming" ? "text-slate-500 dark:text-slate-400" : ""}>
                  <td className="px-3 py-2">{r.number}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(r.dueDate)}</td>
                  <td className="px-3 py-2 text-right">{money(r.interest)}</td>
                  {anyPrincipal && <td className="px-3 py-2 text-right">{r.principal ? money(r.principal) : "—"}</td>}
                  {anyFees && <td className="px-3 py-2 text-right">{r.fees ? money(r.fees) : "—"}</td>}
                  <td className="px-3 py-2 text-right font-medium">{money(r.total)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right text-xs ${st.className}`}>
                    {st.label}
                    {r.status === "partial" || (r.status === "overdue" && r.paid > 0) ? ` · ${t("{amount} paid", { amount: money(r.paid) })}` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {t("Upcoming amounts assume each payment is made on time.")}
      </p>
    </section>
  );
}

const kindLabel = (kind: Payment["kind"]) =>
  kind === "payment" ? t("Payment") : kind === "disbursement" ? t("Lent more") : kind === "fee" ? t("Fee") : t("Forgiven");

function HistoryRow({ entry: p, effect, money }: { entry: Payment; effect?: EntryEffect; money: (n: number) => string }) {
  const parts: string[] = [];
  if (p.kind === "payment" && effect) {
    if (effect.fees > 0.005) parts.push(t("{amount} fees", { amount: money(effect.fees) }));
    if (effect.interest > 0.005) parts.push(t("{amount} interest", { amount: money(effect.interest) }));
    if (effect.principal > 0.005) parts.push(t("{amount} principal", { amount: money(effect.principal) }));
    if (effect.credit > 0.005) parts.push(t("{amount} in advance", { amount: money(effect.credit) }));
  }
  const label =
    p.kind === "payment"
      ? p.allocation === "interest"
        ? t("Interest only")
        : p.allocation === "principal"
          ? t("To principal")
          : t("Payment")
      : kindLabel(p.kind);
  const sign = p.kind === "disbursement" || p.kind === "fee" ? "+" : "−";

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium tabular-nums">
          <span className="mr-2 text-xs font-normal text-slate-500 dark:text-slate-400">{label}</span>
          {p.kind === "payment" ? money(p.amount) : `${sign}${money(p.amount)}`}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {formatDate(p.paid_on)}
          {parts.length > 0 && ` · ${parts.join(" + ")}`}
          {p.method && ` · ${p.method}`}
          {p.note && ` · ${p.note}`}
        </p>
      </div>
      <ConfirmButton
        action={() => deletePayment(p.id)}
        title={t("Delete this record?")}
        message={t("The {label} of {amount} from {date} will be removed and everything recalculated.", {
          label: label.toLowerCase(),
          amount: money(p.amount),
          date: formatDate(p.paid_on),
        })}
        className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
      >
        {t("Remove")}
      </ConfirmButton>
    </div>
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
