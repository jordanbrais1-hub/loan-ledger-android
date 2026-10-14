"use client";

import { useEffect, useRef, useState } from "react";
import { addEntry } from "@/lib/actions";
import { todayISO } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { periodNoun } from "@/lib/plans";
import type { Allocation, EntryKind, Loan, LoanSummary } from "@/lib/types";
import { Field, FormError, buttonClass, inputClass } from "./ui";
import { useFormAction } from "./useFormAction";

type Preset = "due" | "next" | "interest" | "payoff" | "principal" | "other";

interface PresetOption {
  value: Preset;
  label: string;
  amount: number | null;
  allocation: Allocation;
  explain: string;
}

/** Records a payment, more money lent, a fee or a forgiven amount on one loan. */
export function EntryForm({ loan, summary }: { loan: Loan; summary: LoanSummary }) {
  const { state, onSubmit, pending } = useFormAction(addEntry);
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<EntryKind>("payment");
  const [preset, setPreset] = useState<Preset | null>(null);
  const [amount, setAmount] = useState("");
  const errors = state.fieldErrors ?? {};
  const lent = loan.direction === "lent";
  const money = (n: number) => formatMoney(n, loan.currency);
  const period = periodNoun(loan.frequency);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    // Resetting after a successful save is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmount("");
    setPreset(null);
  }, [state]);

  const presets = paymentPresets(loan, summary, money, period);
  const chosen = presets.find((p) => p.value === preset);
  const allocation: Allocation = kind === "payment" ? (chosen?.allocation ?? "auto") : "auto";

  const tabs: { value: EntryKind; label: string }[] = [
    { value: "payment", label: t("Payment") },
    ...(loan.plan !== "installments"
      ? [{ value: "disbursement" as const, label: lent ? t("Lend more") : t("Borrow more") }]
      : []),
    { value: "fee", label: t("Fee") },
    { value: "waiver", label: t("Forgive") },
  ];

  const kindHelp: Record<Exclude<EntryKind, "payment">, string> = {
    disbursement: lent
      ? t("Adds to what they owe you. Interest from now on is on the new total.")
      : t("Adds to what you owe. Interest from now on is on the new total."),
    fee: t("An extra charge, e.g. a late fee you agreed on. It's due right away."),
    waiver: t("Cancels part of the debt without a payment: fees first, then interest, then principal."),
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="loanId" value={loan.id} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="allocation" value={allocation} />

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={kind === t.value}
            onClick={() => {
              setKind(t.value);
              setPreset(null);
              setAmount("");
            }}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition sm:text-sm ${
              kind === t.value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {t("Saved.")}
        </p>
      )}

      {kind === "payment" ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setPreset(p.value);
                setAmount(p.amount !== null && p.amount > 0 ? p.amount.toFixed(2) : "");
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                preset === p.value
                  ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200"
                  : "border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {p.label}
              {p.amount !== null && p.amount > 0 && <span className="ml-1 tabular-nums opacity-75">{money(p.amount)}</span>}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">{kindHelp[kind]}</p>
      )}

      {kind === "payment" && chosen && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          {chosen.explain}
        </p>
      )}

      <Field
        label={`${
          kind === "payment"
            ? lent
              ? t("Amount they paid you")
              : t("Amount you paid")
            : kind === "disbursement"
              ? lent
                ? t("Amount lent")
                : t("Amount borrowed")
              : kind === "fee"
                ? t("Fee amount")
                : t("Amount forgiven")
        } (${loan.currency})`}
        htmlFor="amount"
        errors={errors.amount}
      >
        <input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          placeholder="0.00"
        />
      </Field>

      <div className={`grid gap-3 ${kind === "payment" ? "grid-cols-2" : ""}`}>
        <Field label={t("Date")} htmlFor="paidOn" errors={errors.paidOn}>
          <input id="paidOn" name="paidOn" type="date" required defaultValue={todayISO()} className={inputClass} />
        </Field>
        {kind === "payment" && (
          <Field label={t("Method")} htmlFor="method" errors={errors.method}>
            <input id="method" name="method" list="payment-methods" className={inputClass} placeholder={t("Cash")} />
            <datalist id="payment-methods">
              <option value={t("Cash")} />
              <option value={t("Bank transfer")} />
              <option value="SINPE Móvil" />
              <option value={t("Card")} />
            </datalist>
          </Field>
        )}
      </div>

      <Field label={t("Note (optional)")} htmlFor="note" errors={errors.note}>
        <input id="note" name="note" className={inputClass} />
      </Field>

      <button type="submit" className={`${buttonClass.primary} w-full`} disabled={pending}>
        {pending
          ? t("Saving…")
          : kind === "payment"
            ? t("Record payment")
            : kind === "disbursement"
              ? lent
                ? t("Lend more")
                : t("Borrow more")
              : kind === "fee"
                ? t("Add fee")
                : t("Forgive")}
      </button>
    </form>
  );
}

function paymentPresets(
  loan: Loan,
  s: LoanSummary,
  money: (n: number) => string,
  period: string,
): PresetOption[] {
  const presets: PresetOption[] = [];
  const closed = s.status === "paid";
  if (!closed && s.dueNow > 0.005) {
    presets.push({
      value: "due",
      label: loan.plan === "installments" ? t("Installment due") : t("Amount due"),
      amount: s.dueNow,
      allocation: "auto",
      explain:
        s.periodsBehind > 1
          ? t("Covers everything due now ({n} payments behind).", { n: s.periodsBehind })
          : t("Covers everything due now."),
    });
  } else if (!closed && loan.plan !== "single" && s.next) {
    presets.push({
      value: "next",
      label: loan.plan === "installments" ? t("Next installment") : t("Next payment"),
      amount: s.next.amount,
      allocation: "auto",
      explain: t("Paid ahead of time: it's kept and used for the payment due {date}.", { date: formatDate(s.next.date) }),
    });
  }

  const interest = s.interestDue > 0.005 ? s.interestDue : loan.plan !== "single" && s.next ? s.next.interest : 0;
  if (!closed && loan.interest_rate > 0 && interest > 0.005) {
    presets.push({
      value: "interest",
      label: t("Interest only"),
      amount: interest,
      allocation: "interest",
      explain:
        loan.plan === "single"
          ? t("Pays only the interest so far. The {amount} stays owed.", { amount: money(s.principalLeft) })
          : t("Pays only the interest. The {amount} stays owed and the loan continues to the next {period}.", {
              amount: money(s.principalLeft),
              period,
            }),
    });
  }

  if (!closed && s.payoff > 0.005) {
    presets.push({
      value: "payoff",
      label: t("Pay it all off"),
      amount: s.payoff,
      allocation: "auto",
      explain:
        loan.plan === "single"
          ? t("Pays everything owed today and closes the loan.")
          : loan.early_payoff === "prorated"
            ? t("Pays everything owed today, including this {period}'s interest for the days used, and closes the loan.", { period })
            : t("Pays everything owed today, including this {period}'s interest, and closes the loan.", { period }),
    });
  }

  if (!closed) {
    presets.push({
      value: "principal",
      label: t("Extra to principal"),
      amount: null,
      allocation: "principal",
      explain: t(
        "Goes straight to the principal (abono a capital), so future interest goes down. Interest still owed is not covered.",
      ),
    });
  }
  presets.push({
    value: "other",
    label: t("Other amount"),
    amount: null,
    allocation: "auto",
    explain:
      loan.plan === "single"
        ? t("Pays interest first, then principal.")
        : t("Pays what's due first. Anything extra is kept for the next payment, and the rest lowers the principal."),
  });
  return presets;
}
