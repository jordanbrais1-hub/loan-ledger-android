"use client";

import { buttonClass } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        We couldn&apos;t load your ledger. Try again, or restart the app if it keeps happening.
      </p>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Error ID: {error.digest}</p>}
      <button type="button" onClick={reset} className={`${buttonClass.primary} mt-5`}>
        Try again
      </button>
    </div>
  );
}
