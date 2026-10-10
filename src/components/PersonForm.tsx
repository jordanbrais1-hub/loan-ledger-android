"use client";

import { useState } from "react";
import { updatePerson } from "@/lib/actions";
import type { Person } from "@/lib/types";
import { Card, Field, FormError, buttonClass, inputClass } from "./ui";
import { useFormAction } from "./useFormAction";

export function PersonForm({ person }: { person: Person }) {
  const { state, onSubmit, pending } = useFormAction(updatePerson);
  const [open, setOpen] = useState(false);
  const errors = state.fieldErrors ?? {};

  if (!open) {
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold">Contact details</h2>
          <button type="button" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setOpen(true)}>
            Edit
          </button>
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          <Detail label="Phone" value={person.phone} />
          <Detail label="Email" value={person.email} />
          <Detail label="Notes" value={person.notes} />
        </dl>
        {state.ok && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>}
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <input type="hidden" name="id" value={person.id} />
        <FormError message={state.error} />
        <Field label="Name" htmlFor="name" errors={errors.name}>
          <input id="name" name="name" required defaultValue={person.name} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="phone" errors={errors.phone}>
          <input id="phone" name="phone" type="tel" defaultValue={person.phone ?? ""} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email" errors={errors.email}>
          <input id="email" name="email" type="email" defaultValue={person.email ?? ""} className={inputClass} />
        </Field>
        <Field label="Notes" htmlFor="notes" errors={errors.notes}>
          <textarea id="notes" name="notes" rows={2} defaultValue={person.notes ?? ""} className={inputClass} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass.secondary} onClick={() => setOpen(false)}>
            Close
          </button>
          <button type="submit" className={buttonClass.primary} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        {state.ok && <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>}
      </form>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-14 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={value ? "whitespace-pre-wrap" : "text-slate-400 dark:text-slate-600"}>{value || "—"}</dd>
    </div>
  );
}
