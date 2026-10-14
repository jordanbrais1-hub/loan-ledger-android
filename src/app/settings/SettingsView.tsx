"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { useAccount } from "@/components/AuthGate";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SampleDataButton } from "@/components/Demo";
import { Card, FormError, PageHeader, buttonClass } from "@/components/ui";
import { exportBackup, exportLoansCsv, importBackup } from "@/lib/backup";
import { demoMode } from "@/lib/auth";
import { db } from "@/lib/db";
import { LOCALES, localeNames, setLocale, t } from "@/lib/i18n";
import { useLocale } from "@/components/useLocale";

export function SettingsView() {
  const { account, signOut } = useAccount();
  const locale = useLocale();
  const counts = useLiveQuery(() => Promise.all([db().loans.count(), db().people.count()]), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const run = async (label: string, task: () => Promise<string | void>) => {
    setBusy(label);
    setError(undefined);
    setMessage(undefined);
    try {
      const done = await task();
      if (done) setMessage(done);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t("Something went wrong."));
    } finally {
      setBusy(null);
    }
  };

  const restore = (file: File) =>
    run("restore", async () => {
      const { loans } = await importBackup(await file.text());
      setPendingFile(null);
      return loans === 1 ? t("Backup restored — 1 loan loaded.") : t("Backup restored — {n} loans loaded.", { n: loans });
    });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("Account & backup")} />

      <Card className="flex items-center gap-4 p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {account.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote avatar; next/image needs a server to optimize
            <img src={account.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            (account.name ?? account.email ?? "?").charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{demoMode ? t("Demo version") : (account.name ?? t("Signed in"))}</p>
          {demoMode && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("No sign-in. What you enter is saved only in this browser.")}
            </p>
          )}
          {account.email && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{account.email}</p>}
        </div>
        {demoMode ? (
          <SampleDataButton />
        ) : (
        <ConfirmButton
          action={signOut}
          title={t("Sign out?")}
          message={t("Your ledger stays saved on this device. Sign in with the same Google account to open it again.")}
          confirmLabel={t("Sign out")}
          className={buttonClass.secondary}
        >
          {t("Sign out")}
        </ConfirmButton>
        )}
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold">{t("Language")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("Also in the menu under your picture.")}</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label={t("Language")}>
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={locale === l}
              onClick={() => setLocale(l)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                locale === l
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {localeNames[l]}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">{t("Backup")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {counts
              ? t("Your ledger ({loans} loans, {people} people) is stored only on this device.", { loans: counts[0], people: counts[1] })
              : t("Your ledger is stored only on this device.")}{" "}
            {t("Save a backup now and then — to Google Drive, email or your files — so you can restore it on a new phone.")}
          </p>
        </div>

        <FormError message={error} />
        {message && (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass.primary} disabled={!!busy} onClick={() => run("backup", exportBackup)}>
            {busy === "backup" ? t("Preparing…") : t("Save a backup")}
          </button>
          <button type="button" className={buttonClass.secondary} disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {t("Restore from backup…")}
          </button>
          <button type="button" className={buttonClass.secondary} disabled={!!busy} onClick={() => run("csv", exportLoansCsv)}>
            {busy === "csv" ? t("Exporting…") : t("Export loans as CSV")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              setPendingFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>

        {pendingFile && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <p className="font-medium text-amber-900 dark:text-amber-200">{t("Replace your ledger with “{name}”?", { name: pendingFile.name })}</p>
            <p className="mt-1 text-amber-800 dark:text-amber-300">
              {t("Everything currently in this ledger will be replaced by the backup. This can't be undone.")}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className={buttonClass.danger} disabled={!!busy} onClick={() => restore(pendingFile)}>
                {busy === "restore" ? t("Restoring…") : t("Replace my ledger")}
              </button>
              <button type="button" className={buttonClass.secondary} onClick={() => setPendingFile(null)}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
