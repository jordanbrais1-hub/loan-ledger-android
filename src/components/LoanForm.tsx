"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveLoan } from "@/lib/actions";
import { todayISO } from "@/lib/dates";
import { CURRENCIES, DEFAULT_CURRENCY, currencyNames } from "@/lib/format";
import { loanHref } from "@/lib/routes";
import type { Direction, Loan } from "@/lib/types";
import { Card, Field, FormError, buttonClass, inputClass } from "./ui";
import { useFormAction } from "./useFormAction";

const directionOptions: { value: Direction; title: string; detail: string; active: string }[] = [
  {
    value: "lent",
    title: "I lent money",
    detail: "They owe me",
    active: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30 dark:bg-emerald-950/40",
  },
  {
    value: "borrowed",
    title: "I borrowed money",
    detail: "I owe them",
    active: "border-rose-500 bg-rose-50 ring-2 ring-rose-500/30 dark:bg-rose-950/40",
  },
];

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
  const errors = state.fieldErrors ?? {};
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.id) router.push(loanHref(state.id));
  }, [state, router]);

  return (
    <form onSubmit={onSubmit} noValidate>
      {loan && <input type="hidden" name="id" value={loan.id} />}
      <Card className="space-y-5 p-5 sm:p-6">
        <FormError message={state.error} />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">What happened?</legend>
          <div className="grid grid-cols-2 gap-3">
            {directionOptions.map((o) => (
              <label
                key={o.value}
                className={`cursor-pointer rounded-lg border p-3 transition ${
                  direction === o.value
                    ? o.active
                    : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500"
                }`}
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
            label={direction === "lent" ? "Who did you lend to?" : "Who did you borrow from?"}
            htmlFor="personName"
            hint="Pick someone you've added before, or type a new name."
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
              placeholder="e.g. Maria Lopez"
            />
            <datalist id="people-list">
              {peopleNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>

          <Field label="Amount" htmlFor="principal" errors={errors.principal ?? errors.currency}>
            <div className="flex gap-2">
              <select
                name="currency"
                aria-label="Currency"
                defaultValue={loan?.currency ?? DEFAULT_CURRENCY}
                className={`${inputClass.replace("w-full", "w-auto")} shrink-0`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} title={currencyNames[c]}>
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
                defaultValue={loan?.principal ?? ""}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
          </Field>

          <Field label="Date of the loan" htmlFor="startDate" errors={errors.startDate}>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={loan?.start_date ?? todayISO()}
              className={inputClass}
            />
          </Field>

          <Field label="Due date (optional)" htmlFor="dueDate" hint="When should it be paid back?" errors={errors.dueDate}>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={loan?.due_date ?? ""}
              className={inputClass}
            />
          </Field>

          <Field
            label="Interest rate (% per year)"
            htmlFor="interestRate"
            hint="Leave at 0 for an interest-free loan."
            errors={errors.interestRate}
          >
            <input
              id="interestRate"
              name="interestRate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={loan?.interest_rate ?? 0}
              className={inputClass}
            />
          </Field>

          <Field label="What was it for? (optional)" htmlFor="description" errors={errors.description}>
            <input
              id="description"
              name="description"
              defaultValue={loan?.description ?? ""}
              className={inputClass}
              placeholder="e.g. Rent, car repair"
            />
          </Field>
        </div>

        <Field label="Notes (optional)" htmlFor="notes" errors={errors.notes}>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={loan?.notes ?? ""}
            className={inputClass}
            placeholder="Anything worth remembering about this loan"
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
          <Link href={loan ? loanHref(loan.id) : "/loans"} className={buttonClass.secondary}>
            Cancel
          </Link>
          <button type="submit" className={buttonClass.primary} disabled={pending || state.ok}>
            {pending ? "Saving…" : loan ? "Save changes" : "Add loan"}
          </button>
        </div>
      </Card>
    </form>
  );
}
