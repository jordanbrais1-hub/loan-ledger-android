"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { pool, query } from "@/lib/db";
import type { FormState } from "@/lib/types";
import { loanSchema, paymentSchema, personSchema } from "@/lib/validation";

function invalid(error: z.ZodError): FormState {
  return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(error).fieldErrors };
}

function refreshAll() {
  revalidatePath("/", "layout");
}

/** Finds a person by name (case-insensitive) or creates them. */
async function upsertPerson(name: string): Promise<number> {
  const [row] = await query<{ id: number }>(
    `INSERT INTO people (name) VALUES ($1)
     ON CONFLICT ((lower(name))) DO UPDATE SET name = people.name
     RETURNING id`,
    [name],
  );
  return row.id;
}

export async function saveLoan(_prev: FormState, formData: FormData): Promise<FormState> {
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const parsed = loanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;

  let loanId: number;
  try {
    const personId = await upsertPerson(d.personName);
    const values = [
      personId, d.direction, d.principal, d.interestRate,
      d.startDate, d.dueDate, d.description, d.notes,
    ];
    if (id) {
      await query(
        `UPDATE loans SET person_id = $1, direction = $2, principal = $3, interest_rate = $4,
           start_date = $5, due_date = $6, description = $7, notes = $8, updated_at = now()
         WHERE id = $9`,
        [...values, id],
      );
      loanId = id;
    } else {
      const [row] = await query<{ id: number }>(
        `INSERT INTO loans (person_id, direction, principal, interest_rate, start_date, due_date, description, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        values,
      );
      loanId = row.id;
    }
  } catch (e) {
    console.error(e);
    return { error: "Couldn't save the loan. Is the database running?" };
  }

  refreshAll();
  redirect(`/loans/${loanId}`);
}

export async function deleteLoan(id: number) {
  await query("DELETE FROM loans WHERE id = $1", [id]);
  refreshAll();
  redirect("/loans");
}

export async function addPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  try {
    await query(
      "INSERT INTO payments (loan_id, amount, paid_on, method, note) VALUES ($1, $2, $3, $4, $5)",
      [d.loanId, d.amount, d.paidOn, d.method, d.note],
    );
  } catch (e) {
    console.error(e);
    return { error: "Couldn't record the payment." };
  }
  refreshAll();
  return { ok: true };
}

export async function deletePayment(id: number) {
  await query("DELETE FROM payments WHERE id = $1", [id]);
  refreshAll();
}

export async function updatePerson(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = personSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  try {
    await query("UPDATE people SET name = $1, phone = $2, email = $3, notes = $4 WHERE id = $5", [
      d.name, d.phone, d.email, d.notes, d.id,
    ]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return { fieldErrors: { name: ["Someone else already has this name"] } };
    }
    console.error(e);
    return { error: "Couldn't save changes." };
  }
  refreshAll();
  return { ok: true };
}

/** Deletes a person along with all their loans and payments. */
export async function deletePerson(id: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM loans WHERE person_id = $1", [id]);
    await client.query("DELETE FROM people WHERE id = $1", [id]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  refreshAll();
  redirect("/people");
}
