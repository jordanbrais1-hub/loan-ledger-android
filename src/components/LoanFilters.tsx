"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { inputClass } from "./ui";

export function LoanFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce the search box so we don't reload on every keystroke.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const timer = setTimeout(() => update("q", q.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = params.get("status") ?? "";
  const statusTabs = [
    { value: "", label: t("All") },
    { value: "open", label: t("Open") },
    { value: "overdue", label: t("Overdue") },
    { value: "paid", label: t("Paid off") },
  ];

  return (
    <div className="mb-4 space-y-3">
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => update("status", tab.value)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
              status === tab.value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Search by name, purpose or notes…")}
          aria-label={t("Search loans")}
          className={inputClass}
        />
        <select
          aria-label={t("Direction")}
          value={params.get("direction") ?? ""}
          onChange={(e) => update("direction", e.target.value)}
          className={inputClass}
        >
          <option value="">{t("Both directions")}</option>
          <option value="lent">{t("They owe me")}</option>
          <option value="borrowed">{t("I owe them")}</option>
        </select>
        <select
          aria-label={t("Sort by")}
          value={params.get("sort") ?? ""}
          onChange={(e) => update("sort", e.target.value)}
          className={inputClass}
        >
          <option value="">{t("Newest first")}</option>
          <option value="oldest">{t("Oldest first")}</option>
          <option value="due">{t("Due date (soonest)")}</option>
          <option value="balance">{t("Balance (largest)")}</option>
        </select>
      </div>
    </div>
  );
}
