"use client";

import { useSyncExternalStore } from "react";
import { getDebtView, setDebtView, subscribeDebtView, type DebtView } from "@/lib/debt-view";
import { t } from "@/lib/i18n";

/** The chosen debt view; re-renders when it changes. Always "with" on the server. */
export function useDebtView(): DebtView {
  return useSyncExternalStore(subscribeDebtView, getDebtView, () => "with");
}

/** Switches every amount owed between "with interest" and "without interest". */
export function DebtToggle({ className = "" }: { className?: string }) {
  const view = useDebtView();
  const options: { value: DebtView; label: string }[] = [
    { value: "with", label: t("With interest") },
    { value: "without", label: t("Without interest") },
  ];
  return (
    <div
      role="group"
      aria-label={t("Show debt")}
      className={`inline-flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 ${className}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={view === o.value}
          onClick={() => setDebtView(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
            view === o.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
