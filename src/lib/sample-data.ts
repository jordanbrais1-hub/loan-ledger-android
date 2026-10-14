import { addDays, addMonths, todayISO } from "./dates";
import { LEGACY_TERMS, db, nowISO, type LoanRow, type PaymentRow } from "./db";
import { t } from "./i18n";
import { installmentPlan, periodRate } from "./loan-math";

type NewLoan = Omit<LoanRow, "id" | "person_id" | "created_at" | "updated_at"> & { person: string };
type NewEntry = Pick<PaymentRow, "amount" | "paid_on"> & Partial<Pick<PaymentRow, "kind" | "allocation" | "method">>;

/**
 * Adds a few example loans (one per repayment plan), dated around today, so
 * someone trying the demo can see how everything works.
 */
export async function loadSampleData() {
  const today = todayISO();
  const installment = installmentPlan(300000, periodRate(5, "month", "monthly"), 12, "declining").installment;
  const samples: [NewLoan, NewEntry[]][] = [
    [
      {
        ...LEGACY_TERMS, person: "María Rodríguez", direction: "lent", currency: "CRC", principal: 100000,
        plan: "interest_only", interest_rate: 20, rate_period: "month", start_date: addMonths(today, -2), due_date: null,
        description: t("Example: interest only, 20% a month"), notes: null,
      },
      [{ amount: 20000, paid_on: addMonths(today, -1), allocation: "interest", method: "SINPE Móvil" }],
    ],
    [
      {
        ...LEGACY_TERMS, person: "Carlos Méndez", direction: "lent", currency: "CRC", principal: 300000,
        plan: "installments", interest_rate: 5, rate_period: "month", term: 12, start_date: addDays(addMonths(today, -3), -5),
        due_date: null, late_fee_type: "fixed", late_fee_value: 2000, grace_days: 3,
        description: t("Example: 12 monthly installments"), notes: null,
      },
      [
        { amount: installment, paid_on: addDays(addMonths(today, -2), -5), method: t("Cash") },
        { amount: installment, paid_on: addDays(addMonths(today, -1), -5), method: t("Cash") },
      ],
    ],
    [
      {
        ...LEGACY_TERMS, person: "Laura Jiménez", direction: "lent", currency: "CRC", principal: 100000,
        interest_rate: 20, rate_period: "flat", start_date: addDays(today, -10), due_date: addDays(today, 20),
        description: t("Example: one-time, 20% fixed"), notes: null,
      },
      [{ amount: 30000, paid_on: addDays(today, -3), method: "SINPE Móvil" }],
    ],
    [
      {
        ...LEGACY_TERMS, person: "Pedro Vargas", direction: "borrowed", currency: "USD", principal: 500,
        interest_rate: 0, start_date: addDays(today, -15), due_date: addDays(today, 45),
        description: t("Example: money I borrowed, no interest"), notes: null,
      },
      [],
    ],
  ];

  await db().transaction("rw", db().people, db().loans, db().payments, async () => {
    for (const [{ person, ...loan }, entries] of samples) {
      const name_lower = person.toLowerCase();
      const existing = await db().people.where("name_lower").equals(name_lower).first();
      const person_id =
        existing?.id ??
        (await db().people.add({ name: person, name_lower, phone: null, email: null, notes: null, created_at: nowISO() }));
      const loan_id = await db().loans.add({ ...loan, person_id, created_at: nowISO(), updated_at: nowISO() });
      for (const e of entries) {
        await db().payments.add({
          loan_id, kind: e.kind ?? "payment", allocation: e.allocation ?? "auto", amount: e.amount, paid_on: e.paid_on,
          method: e.method ?? null, note: null, created_at: nowISO(),
        });
      }
    }
  });
}
