import { z } from "zod";
import { CURRENCIES } from "./format";
import { t } from "./i18n";
import {
  ALLOCATIONS,
  AMORTIZATIONS,
  EARLY_PAYOFFS,
  ENTRY_KINDS,
  FREQUENCIES,
  LATE_FEE_TYPES,
  PLANS,
  RATE_PERIODS,
} from "./types";

/** An error message translated when the form is checked, so it's in the current language. */
const msg = (text: string) => ({ error: () => t(text) });

const optionalText = z
  .string()
  .trim()
  .max(1000, msg("That's too long"))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg("Pick a valid date"));
const optionalDate = z
  .string()
  .default("")
  .transform((v) => (v === "" ? null : v))
  .pipe(isoDate.nullable());
/** A form number that may be left empty. */
const optionalNumber = (schema: z.ZodNumber) =>
  z
    .string()
    .default("")
    .transform((v) => (v.trim() === "" ? null : Number(v)))
    .pipe(schema.nullable());

export const loanSchema = z
  .object({
    personName: z.string().trim().min(1, msg("Who is this loan with?")).max(120, msg("That's too long")),
    direction: z.enum(["lent", "borrowed"], msg("Choose who owes whom")),
    currency: z.enum(CURRENCIES, msg("Choose a currency")),
    principal: z.coerce
      .number(msg("Enter an amount"))
      .positive(msg("Amount must be greater than zero"))
      .max(999_999_999_999, msg("That amount is too large")),
    plan: z.enum(PLANS).default("single"),
    interestRate: z.coerce
      .number(msg("Enter a number"))
      .min(0, msg("Rate can't be negative"))
      .max(1000, msg("That rate looks too high")),
    ratePeriod: z.enum(RATE_PERIODS).default("year"),
    startDate: isoDate,
    dueDate: optionalDate,
    frequency: z.enum(FREQUENCIES).default("monthly"),
    firstDueDate: optionalDate,
    term: optionalNumber(
      z.number(msg("Enter a whole number")).int(msg("Enter a whole number")).min(1, msg("At least 1")).max(600, msg("At most 600")),
    ),
    amortization: z.enum(AMORTIZATIONS).default("declining"),
    lateFeeType: z.enum(LATE_FEE_TYPES).default("none"),
    lateFeeValue: optionalNumber(
      z.number(msg("Enter a number")).min(0, msg("Can't be negative")).max(999_999_999, msg("That amount is too large")),
    ),
    graceDays: optionalNumber(
      z.number(msg("Enter a whole number")).int(msg("Enter a whole number")).min(0, msg("Can't be negative")).max(365, msg("At most 365")),
    ),
    earlyPayoff: z.enum(EARLY_PAYOFFS).default("full_period"),
    description: optionalText,
    notes: optionalText,
  })
  .superRefine((d, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (d.plan === "single" && d.dueDate && d.dueDate < d.startDate) {
      issue("dueDate", t("Due date can't be before the start date"));
    }
    if (d.plan !== "single" && d.firstDueDate && d.firstDueDate <= d.startDate) {
      issue("firstDueDate", t("The first payment must be after the loan date"));
    }
    if (d.plan === "installments" && !d.term) issue("term", t("How many payments?"));
    if (d.plan !== "single" && d.ratePeriod === "flat") {
      issue("ratePeriod", t("A fixed % only works with a one-time repayment"));
    }
    if (d.lateFeeType !== "none" && !d.lateFeeValue) issue("lateFeeValue", t("Enter the late fee"));
    if (d.lateFeeType === "percent" && (d.lateFeeValue ?? 0) > 100) issue("lateFeeValue", t("At most 100%"));
  });

export const entrySchema = z.object({
  loanId: z.coerce.number().int().positive(),
  kind: z.enum(ENTRY_KINDS).default("payment"),
  allocation: z.enum(ALLOCATIONS).default("auto"),
  amount: z.coerce
    .number(msg("Enter an amount"))
    .positive(msg("Amount must be greater than zero"))
    .max(999_999_999_999, msg("That amount is too large")),
  paidOn: isoDate,
  method: optionalText,
  note: optionalText,
});

export const personSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, msg("Name is required")).max(120, msg("That's too long")),
  phone: optionalText,
  email: optionalText.pipe(z.email(msg("Enter a valid email")).nullable()),
  notes: optionalText,
});
