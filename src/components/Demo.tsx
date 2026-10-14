"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { loadSampleData } from "@/lib/sample-data";
import { buttonClass } from "./ui";

export const REPO_URL = "https://github.com/jordanbrais1-hub/loan-ledger-android";

/** Shown on every page of the public web demo. */
export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
      <span className="font-semibold">{t("Demo version")}</span> ·{" "}
      {t("No sign-in. What you enter is saved only in this browser.")}{" "}
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="font-medium underline">
        {t("View the code and contribute on GitHub")}
      </a>
    </div>
  );
}

/** Fills the demo ledger with example loans. */
export function SampleDataButton({ className = buttonClass.secondary }: { className?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  return (
    <button
      type="button"
      className={className}
      disabled={state !== "idle"}
      onClick={() => {
        setState("busy");
        loadSampleData()
          .then(() => setState("done"))
          .catch((e) => {
            console.error(e);
            setState("idle");
          });
      }}
    >
      {state === "busy" ? t("Loading…") : state === "done" ? t("Example loans added") : t("Load example loans")}
    </button>
  );
}
