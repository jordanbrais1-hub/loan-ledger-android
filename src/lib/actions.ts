import { z } from "zod";
import { db, nowISO } from "./db";
import { t } from "./i18n";
import type { FormState } from "./types";
import { entrySchema, loanSchema, personSchema } from "./validation";

// These used to be server actions writing to Postgres. They now write to the
// on-device database; pages re-render on their own because they read through
// live queries.

function invalid(error: z.ZodError): FormState {
  return { error: t("Please fix the highlighted fields."), fieldErrors: z.flattenError(error).fieldErrors };
}

/** Finds a person by name (case-insensitive) or creates them. */
async function upsertPerson(name: string): Promise<number> {
  const name_lower = name.toLowerCase();
  const existing = await db().people.where("name_lower").equals(name_lower).first();
  if (existing) return existing.id;
  return db().people.add({ name, name_lower, phone: null, email: null, notes: null, created_at: nowISO() });
}

/** Creates or updates a loan. On success, `state.id` is the loan to open. */
export async function saveLoan(_prev: FormState, formData: FormData): Promise<FormState> {
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const parsed = loanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;

  try {
    const loanId = await db().transaction("rw", db().people, db().loans, async () => {
      const periodic = d.plan !== "single";
      const values = {
        person_id: await upsertPerson(d.personName),
        direction: d.direction,
        currency: d.currency,
        principal: d.principal,
        plan: d.plan,
        interest_rate: d.interestRate,
        rate_period: d.ratePeriod,
        start_date: d.startDate,
        due_date: periodic ? null : d.dueDate,
        frequency: d.frequency,
        first_due_date: periodic ? d.firstDueDate : null,
        term: periodic ? d.term : null,
        amortization: d.amortization,
        late_fee_type: d.lateFeeType,
        late_fee_value: d.lateFeeType === "none" ? 0 : (d.lateFeeValue ?? 0),
        grace_days: d.lateFeeType === "none" ? 0 : (d.graceDays ?? 0),
        early_payoff: d.earlyPayoff,
        description: d.description,
        notes: d.notes,
        updated_at: nowISO(),
      };
      if (id) {
        await db().loans.update(id, values);
        return id;
      }
      return db().loans.add({ ...values, created_at: nowISO() });
    });
    return { ok: true, id: loanId };
  } catch (e) {
    console.error(e);
    return { error: t("Couldn't save the loan.") };
  }
}

export async function deleteLoan(id: number) {
  await db().transaction("rw", db().loans, db().payments, async () => {
    await db().payments.where("loan_id").equals(id).delete();
    await db().loans.delete(id);
  });
}

/** Records a payment, more money lent, a fee, or a forgiven amount on a loan. */
export async function addEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = entrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  try {
    const loan = await db().loans.get(d.loanId);
    if (!loan) return { error: t("That loan no longer exists.") };
    if (d.kind === "disbursement" && loan.plan === "installments") {
      return { error: t("Installment loans can't be increased. Create a new loan instead.") };
    }
    await db().payments.add({
      loan_id: d.loanId,
      kind: d.kind,
      allocation: d.kind === "payment" ? d.allocation : "auto",
      amount: d.amount,
      paid_on: d.paidOn,
      method: d.kind === "payment" ? d.method : null,
      note: d.note,
      created_at: nowISO(),
    });
  } catch (e) {
    console.error(e);
    return { error: t("Couldn't save that.") };
  }
  return { ok: true };
}

export async function deletePayment(id: number) {
  await db().payments.delete(id);
}

export async function updatePerson(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = personSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const name_lower = d.name.toLowerCase();
  try {
    const clash = await db().people.where("name_lower").equals(name_lower).first();
    if (clash && clash.id !== d.id) {
      return { fieldErrors: { name: [t("Someone else already has this name")] } };
    }
    await db().people.update(d.id, { name: d.name, name_lower, phone: d.phone, email: d.email, notes: d.notes });
  } catch (e) {
    console.error(e);
    return { error: t("Couldn't save changes.") };
  }
  return { ok: true };
}

/** Deletes a person along with all their loans and payments. */
export async function deletePerson(id: number) {
  await db().transaction("rw", db().people, db().loans, db().payments, async () => {
    const loanIds = await db().loans.where("person_id").equals(id).primaryKeys();
    await db().payments.where("loan_id").anyOf(loanIds).delete();
    await db().loans.bulkDelete(loanIds);
    await db().people.delete(id);
  });
}
