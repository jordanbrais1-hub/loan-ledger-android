import { z } from "zod";
import { CURRENCIES } from "./format";

const optionalText = z
  .string()
  .trim()
  .max(1000)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");

export const loanSchema = z
  .object({
    personName: z.string().trim().min(1, "Who is this loan with?").max(120),
    direction: z.enum(["lent", "borrowed"], { message: "Choose who owes whom" }),
    currency: z.enum(CURRENCIES, { message: "Choose a currency" }),
    principal: z.coerce
      .number({ message: "Enter an amount" })
      .positive("Amount must be greater than zero")
      .max(999_999_999_999, "That amount is too large"),
    interestRate: z.coerce
      .number({ message: "Enter a number" })
      .min(0, "Rate can't be negative")
      .max(1000, "That rate looks too high"),
    startDate: isoDate,
    dueDate: z
      .string()
      .transform((v) => (v === "" ? null : v))
      .pipe(isoDate.nullable()),
    description: optionalText,
    notes: optionalText,
  })
  .refine((d) => !d.dueDate || d.dueDate >= d.startDate, {
    path: ["dueDate"],
    message: "Due date can't be before the start date",
  });

export const paymentSchema = z.object({
  loanId: z.coerce.number().int().positive(),
  amount: z.coerce
    .number({ message: "Enter an amount" })
    .positive("Amount must be greater than zero")
    .max(999_999_999_999),
  paidOn: isoDate,
  method: optionalText,
  note: optionalText,
});

export const personSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: optionalText,
  email: optionalText.pipe(z.email("Enter a valid email").nullable()),
  notes: optionalText,
});
