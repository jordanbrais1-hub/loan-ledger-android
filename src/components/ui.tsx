import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import type { Direction, LoanStatus } from "@/lib/types";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 " +
  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white " +
    "shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 " +
    "disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium " +
    "text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 " +
    "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white " +
    "shadow-sm hover:bg-rose-500 disabled:opacity-60",
  ghostDanger:
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 " +
    "hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50",
};

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          &larr; {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const statTone = {
  green: "text-emerald-600 dark:text-emerald-400",
  red: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-900 dark:text-slate-100",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  /** Several values (e.g. one per currency) are shown on separate lines. */
  value: string | string[];
  hint?: string;
  tone?: keyof typeof statTone;
}) {
  const lines = typeof value === "string" ? [value] : value;
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className={`mt-2 font-semibold tabular-nums ${lines.length > 1 ? "text-xl" : "text-2xl"} ${statTone[tone]}`}>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  );
}

const statusStyles: Record<LoanStatus, string> = {
  active: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/60 dark:text-sky-300",
  overdue: "bg-amber-50 text-amber-800 ring-amber-600/30 dark:bg-amber-950/60 dark:text-amber-300",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300",
};
const statusLabel = (status: LoanStatus) =>
  status === "active" ? t("Active") : status === "overdue" ? t("Overdue") : t("Paid off");

export function StatusBadge({ status }: { status: LoanStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: Direction }) {
  return direction === "lent" ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {t("They owe me")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-400">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      {t("I owe them")}
    </span>
  );
}

export function ProgressBar({ value, direction }: { value: number; direction: Direction }) {
  const pct = Math.round(value * 100);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${direction === "lent" ? "bg-emerald-500" : "bg-rose-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5Z" />
        <path d="M8 7h6M8 11h6M8 15h4" strokeLinecap="round" />
      </svg>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  errors,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  errors?: string[];
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {errors?.length ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors[0]}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
    >
      {message}
    </div>
  );
}

export function Loading() {
  return (
    <div role="status" className="flex flex-1 items-center justify-center py-16 text-sm text-slate-500 dark:text-slate-400">
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" aria-hidden />
      {t("Loading…")}
    </div>
  );
}

export function NotFoundState() {
  return (
    <EmptyState
      title={t("Not found")}
      message={t("That loan or person doesn't exist. It may have been deleted.")}
      action={
        <Link href="/" className={buttonClass.primary}>
          {t("Back to dashboard")}
        </Link>
      }
    />
  );
}
