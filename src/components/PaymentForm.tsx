"use client";

import { useEffect, useRef } from "react";
import { addPayment } from "@/lib/actions";
import { todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/format";
import type { Direction } from "@/lib/types";
import { Field, FormError, buttonClass, inputClass } from "./ui";
import { useFormAction } from "./useFormAction";

export function PaymentForm({
  loanId,
  balance,
  currency,
  direction,
}: {
  loanId: number;
  balance: number;
  currency: Currency;
  direction: Direction;
}) {
  const { state, onSubmit, pending } = useFormAction(addPayment);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="loanId" value={loanId} />
      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Payment recorded.
        </p>
      )}

      <Field label={`${direction === "lent" ? "Amount they paid you" : "Amount you paid"} (${currency})`} htmlFor="amount" errors={errors.amount}>
        <div className="flex gap-2">
          <input
            ref={amountRef}
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            className={inputClass}
            placeholder="0.00"
          />
          {balance > 0 && (
            <button
              type="button"
              className={`${buttonClass.secondary} shrink-0 px-3`}
              title={`Fill in the full balance of ${formatMoney(balance, currency)}`}
              onClick={() => {
                if (amountRef.current) amountRef.current.value = balance.toFixed(2);
              }}
            >
              Full
            </button>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="paidOn" errors={errors.paidOn}>
          <input id="paidOn" name="paidOn" type="date" required defaultValue={todayISO()} className={inputClass} />
        </Field>
        <Field label="Method" htmlFor="method" errors={errors.method}>
          <input id="method" name="method" list="payment-methods" className={inputClass} placeholder="Cash" />
          <datalist id="payment-methods">
            <option value="Cash" />
            <option value="Bank transfer" />
            <option value="Card" />
            <option value="Mobile payment" />
          </datalist>
        </Field>
      </div>

      <Field label="Note (optional)" htmlFor="note" errors={errors.note}>
        <input id="note" name="note" className={inputClass} />
      </Field>

      <button type="submit" className={`${buttonClass.primary} w-full`} disabled={pending}>
        {pending ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}
