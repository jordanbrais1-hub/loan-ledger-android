"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveLoan } from "@/lib/actions";
import { addPeriods, todayISO } from "@/lib/dates";
import { CURRENCIES, DEFAULT_CURRENCY, currencyName, formatDate, formatMoney, type Currency } from "@/lib/format";
import { t } from "@/lib/i18n";
import { installmentPlan, monthlyRate, periodRate } from "@/lib/loan-math";
import { frequencyName, periodNoun, planDetail, planName, ratePeriodName } from "@/lib/plans";
import { loanHref } from "@/lib/routes";
import {
  FREQUENCIES,
  PLANS,
  type Amortization,
  type Direction,
  type Frequency,
  type LateFeeType,
  type Loan,
  type Plan,
  type RatePeriod,
} from "@/lib/types";
import { Card, Field, FormError, buttonClass, inputClass } from "./ui";
import { useFormAction } from "./useFormAction";

const directionOptions = (): { value: Direction; title: string; detail: string; active: string }[] => [
  {
    value: "lent",
    title: t("I lent money"),
    detail: t("They owe me"),
    active: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30 dark:bg-emerald-950/40",
  },
  {
    value: "borrowed",
    title: t("I borrowed money"),
    detail: t("I owe them"),
    active: "border-rose-500 bg-rose-50 ring-2 ring-rose-500/30 dark:bg-rose-950/40",
  },
];

const selectedCard = "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/30 dark:bg-indigo-950/40";
const idleCard = "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500";
const narrowInput = `${inputClass.replace("w-full", "w-auto")} shrink-0`;

export function LoanForm({
  loan,
  peopleNames,
  defaultPerson,
}: {
  loan?: Loan;
  peopleNames: string[];
  defaultPerson?: string;
}) {
  const { state, onSubmit, pending } = useFormAction(saveLoan);
  const [direction, setDirection] = useState<Direction>(loan?.direction ?? "lent");
  const [plan, setPlan] = useState<Plan>(loan?.plan ?? "single");
  const [currency, setCurrency] = useState<Currency>(loan?.currency ?? DEFAULT_CURRENCY);
  const [principal, setPrincipal] = useState(loan ? String(loan.principal) : "");
  const [rate, setRate] = useState(loan ? String(loan.interest_rate) : "0");
  // New interest-only and installment loans are usually quoted per month.
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>(loan?.rate_period ?? "year");
  const [startDate, setStartDate] = useState(loan?.start_date ?? todayISO());
  const [frequency, setFrequency] = useState<Frequency>(loan?.frequency ?? "monthly");
  const [term, setTerm] = useState(loan?.term ? String(loan.term) : "");
  const [amortization, setAmortization] = useState<Amortization>(loan?.amortization ?? "declining");
  const [lateFeeType, setLateFeeType] = useState<LateFeeType>(loan?.late_fee_type ?? "none");
  const errors = state.fieldErrors ?? {};
  const router = useRouter();
  const periodic = plan !== "single";

  useEffect(() => {
    if (state.ok && state.id) router.push(loanHref(state.id));
  }, [state, router]);

  const choosePlan = (next: Plan) => {
    setPlan(next);
    // A fixed % only exists for one-time loans; periodic loans are usually quoted per month.
    if (next !== "single" && (ratePeriod === "flat" || (!loan && plan === "single"))) setRatePeriod("month");
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      {loan && <input type="hidden" name="id" value={loan.id} />}
      <Card className="space-y-6 p-5 sm:p-6">
        <FormError message={state.error} />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t("What happened?")}</legend>
          <div className="grid grid-cols-2 gap-3">
            {directionOptions().map((o) => (
              <label
                key={o.value}
                className={`cursor-pointer rounded-lg border p-3 transition ${direction === o.value ? o.active : idleCard}`}
              >
                <input
                  type="radio"
                  name="direction"
                  value={o.value}
                  checked={direction === o.value}
                  onChange={() => setDirection(o.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{o.detail}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={direction === "lent" ? t("Who did you lend to?") : t("Who did you borrow from?")}
            htmlFor="personName"
            hint={t("Pick someone you've added before, or type a new name.")}
            errors={errors.personName}
          >
            <input
              id="personName"
              name="personName"
              list="people-list"
              autoComplete="off"
              required
              defaultValue={loan?.person_name ?? defaultPerson ?? ""}
              className={inputClass}
              placeholder={t("e.g. Maria Lopez")}
            />
            <datalist id="people-list">
              {peopleNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>

          <Field label={t("Amount")} htmlFor="principal" errors={errors.principal ?? errors.currency}>
            <div className="flex gap-2">
              <select
                name="currency"
                aria-label={t("Currency")}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className={narrowInput}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} title={currencyName(c)}>
                    {c === "CRC" ? "₡ CRC" : "$ USD"}
                  </option>
                ))}
              </select>
              <input
                id="principal"
                name="principal"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
          </Field>

          <Field label={t("Date of the loan")} htmlFor="startDate" errors={errors.startDate}>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label={t("What was it for? (optional)")} htmlFor="description" errors={errors.description}>
            <input
              id="description"
              name="description"
              defaultValue={loan?.description ?? ""}
              className={inputClass}
              placeholder={t("e.g. Rent, car repair")}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t("How will it be repaid?")}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <label key={p} className={`cursor-pointer rounded-lg border p-3 transition ${plan === p ? selectedCard : idleCard}`}>
                <input
                  type="radio"
                  name="plan"
                  value={p}
                  checked={plan === p}
                  onChange={() => choosePlan(p)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold">{planName(p)}</span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{planDetail(p)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t("Interest rate")}
            htmlFor="interestRate"
            hint={
              ratePeriod === "flat"
                ? t("Charged once on the amount lent, however long it takes to repay.")
                : t("Leave at 0 for an interest-free loan.")
            }
            errors={errors.interestRate ?? errors.ratePeriod}
          >
            <div className="flex gap-2">
              <input
                id="interestRate"
                name="interestRate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className={inputClass}
              />
              <select
                name="ratePeriod"
                aria-label={t("Rate period")}
                value={ratePeriod}
                onChange={(e) => setRatePeriod(e.target.value as RatePeriod)}
                className={narrowInput}
              >
                <option value="month">{ratePeriodName("month")}</option>
                <option value="year">{ratePeriodName("year")}</option>
                {!periodic && <option value="flat">{ratePeriodName("flat")}</option>}
              </select>
            </div>
          </Field>

          {!periodic ? (
            <Field label={t("Due date (optional)")} htmlFor="dueDate" hint={t("When should it be paid back?")} errors={errors.dueDate}>
              <input id="dueDate" name="dueDate" type="date" defaultValue={loan?.due_date ?? ""} className={inputClass} />
            </Field>
          ) : (
            <>
              <Field label={t("How often?")} htmlFor="frequency" errors={errors.frequency}>
                <select
                  id="frequency"
                  name="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className={inputClass}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {frequencyName(f)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={plan === "installments" ? t("Number of payments") : t("Number of payments (optional)")}
                htmlFor="term"
                hint={
                  plan === "installments"
                    ? undefined
                    : t("Leave empty if it continues until they repay. Otherwise the principal is due with the last payment.")
                }
                errors={errors.term}
              >
                <input
                  id="term"
                  name="term"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className={inputClass}
                  placeholder={plan === "installments" ? t("e.g. 12") : t("Until repaid")}
                />
              </Field>

              <Field
                label={t("First payment date")}
                htmlFor="firstDueDate"
                hint={startDate ? t("Default: {date}", { date: formatDate(addPeriods(startDate, frequency, 1)) }) : undefined}
                errors={errors.firstDueDate}
              >
                <input
                  id="firstDueDate"
                  name="firstDueDate"
                  type="date"
                  defaultValue={loan?.first_due_date ?? ""}
                  className={inputClass}
                />
              </Field>

              {plan === "installments" && (
                <Field
                  label={t("Interest is charged on")}
                  htmlFor="amortization"
                  hint={
                    amortization === "declining"
                      ? t("What's still owed: interest goes down as they pay (most common).")
                      : t("The original amount every period, even as it's repaid.")
                  }
                >
                  <select
                    id="amortization"
                    name="amortization"
                    value={amortization}
                    onChange={(e) => setAmortization(e.target.value as Amortization)}
                    className={inputClass}
                  >
                    <option value="declining">{t("The remaining balance")}</option>
                    <option value="flat">{t("The original amount (flat)")}</option>
                  </select>
                </Field>
              )}
            </>
          )}
        </div>

        <PlanPreview
          plan={plan}
          currency={currency}
          principal={Number(principal)}
          rate={Number(rate)}
          ratePeriod={ratePeriod}
          frequency={frequency}
          term={Number(term)}
          amortization={amortization}
        />

        <details className="group rounded-lg border border-slate-200 dark:border-slate-800" open={lateFeeType !== "none"}>
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            {periodic ? t("More options: late fee, early payoff") : t("More options: late fee")}
          </summary>
          <div className="grid gap-5 border-t border-slate-200 p-4 sm:grid-cols-2 dark:border-slate-800">
            <Field
              label={t("Late fee (mora)")}
              htmlFor="lateFeeType"
              hint={t("Charged once for each payment that's still unpaid after the grace days.")}
              errors={errors.lateFeeType}
            >
              <select
                id="lateFeeType"
                name="lateFeeType"
                value={lateFeeType}
                onChange={(e) => setLateFeeType(e.target.value as LateFeeType)}
                className={inputClass}
              >
                <option value="none">{t("No late fee")}</option>
                <option value="fixed">{t("A fixed amount")}</option>
                <option value="percent">{t("A % of what's late")}</option>
              </select>
            </Field>
            {lateFeeType !== "none" && (
              <>
                <Field
                  label={lateFeeType === "fixed" ? t("Fee amount ({currency})", { currency }) : t("Fee (% of what's late)")}
                  htmlFor="lateFeeValue"
                  errors={errors.lateFeeValue}
                >
                  <input
                    id="lateFeeValue"
                    name="lateFeeValue"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    defaultValue={loan?.late_fee_value || ""}
                    className={inputClass}
                  />
                </Field>
                <Field
                  label={t("Grace days")}
                  htmlFor="graceDays"
                  hint={t("Days after the due date before the fee applies.")}
                  errors={errors.graceDays}
                >
                  <input
                    id="graceDays"
                    name="graceDays"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    defaultValue={loan?.grace_days ?? 0}
                    className={inputClass}
                  />
                </Field>
              </>
            )}
            {periodic && (
              <Field
                label={t("If they pay it all off early")}
                htmlFor="earlyPayoff"
                hint={t("Interest charged for the {period} in which they pay it off.", { period: periodNoun(frequency) })}
              >
                <select id="earlyPayoff" name="earlyPayoff" defaultValue={loan?.early_payoff ?? "full_period"} className={inputClass}>
                  <option value="full_period">
                    {t("Charge the whole {period}'s interest", { period: periodNoun(frequency) })}
                  </option>
                  <option value="prorated">{t("Charge only the days used")}</option>
                </select>
              </Field>
            )}
          </div>
        </details>

        <Field label={t("Notes (optional)")} htmlFor="notes" errors={errors.notes}>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={loan?.notes ?? ""}
            className={inputClass}
            placeholder={t("Anything worth remembering about this loan")}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
          <Link href={loan ? loanHref(loan.id) : "/loans"} className={buttonClass.secondary}>
            {t("Cancel")}
          </Link>
          <button type="submit" className={buttonClass.primary} disabled={pending || state.ok}>
            {pending ? t("Saving…") : loan ? t("Save changes") : t("Add loan")}
          </button>
        </div>
      </Card>
    </form>
  );
}

/** What the borrower will pay, worked out as the form is filled in. */
function PlanPreview({
  plan,
  currency,
  principal,
  rate,
  ratePeriod,
  frequency,
  term,
  amortization,
}: {
  plan: Plan;
  currency: Currency;
  principal: number;
  rate: number;
  ratePeriod: RatePeriod;
  frequency: Frequency;
  term: number;
  amortization: Amortization;
}) {
  if (!(principal > 0) || !(rate >= 0)) return null;
  const money = (n: number) => formatMoney(n, currency);
  const period = periodNoun(frequency);
  const r = periodRate(rate, ratePeriod, frequency);
  let text: string | null = null;

  if (plan === "single" && ratePeriod === "flat") {
    if (rate > 0) {
      const interest = principal * (rate / 100);
      text = t("{interest} of interest, charged once: {total} to repay in total.", {
        interest: money(interest),
        total: money(principal + interest),
      });
    }
  } else if (plan === "single") {
    if (rate > 0) {
      text = t("About {amount} of interest per month while it's unpaid.", {
        amount: money(principal * monthlyRate(rate, ratePeriod)),
      });
    }
  } else if (plan === "interest_only") {
    const interest = money(principal * r);
    text =
      term > 0
        ? t("Every {period}: {interest} of interest. With the last of {n} payments they also repay the {principal}.", {
            period,
            interest,
            n: term,
            principal: money(principal),
          })
        : t(
            "Every {period}: {interest} of interest. The {principal} is repaid whenever they can; paying only the interest rolls the loan over.",
            { period, interest, principal: money(principal) },
          );
  } else if (term > 0) {
    const { installment, totalInterest } = installmentPlan(principal, r, term, amortization);
    text = t("{n} payments of {installment} — {total} in total, {interest} of it interest.", {
      n: term,
      installment: money(installment),
      total: money(principal + totalInterest),
      interest: money(totalInterest),
    });
  }
  if (!text) return null;
  return (
    <p className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">{text}</p>
  );
}
