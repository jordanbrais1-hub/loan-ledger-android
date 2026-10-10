"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { useAccount } from "@/components/AuthGate";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Card, FormError, PageHeader, buttonClass } from "@/components/ui";
import { exportBackup, exportLoansCsv, importBackup } from "@/lib/backup";
import { db } from "@/lib/db";

export function SettingsView() {
  const { account, signOut } = useAccount();
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
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const restore = (file: File) =>
    run("restore", async () => {
      const { loans } = await importBackup(await file.text());
      setPendingFile(null);
      return `Backup restored — ${loans} loan${loans === 1 ? "" : "s"} loaded.`;
    });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Account & backup" />

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
          <p className="truncate font-medium">{account.name ?? "Signed in"}</p>
          {account.email && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{account.email}</p>}
        </div>
        <ConfirmButton
          action={signOut}
          title="Sign out?"
          message="Your ledger stays saved on this device. Sign in with the same Google account to open it again."
          confirmLabel="Sign out"
          className={buttonClass.secondary}
        >
          Sign out
        </ConfirmButton>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Backup</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your ledger{counts ? ` (${counts[0]} loans, ${counts[1]} people)` : ""} is stored only on this device. Save a
            backup now and then — to Google Drive, email or your files — so you can restore it on a new phone.
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
            {busy === "backup" ? "Preparing…" : "Save a backup"}
          </button>
          <button type="button" className={buttonClass.secondary} disabled={!!busy} onClick={() => fileRef.current?.click()}>
            Restore from backup…
          </button>
          <button type="button" className={buttonClass.secondary} disabled={!!busy} onClick={() => run("csv", exportLoansCsv)}>
            {busy === "csv" ? "Exporting…" : "Export loans as CSV"}
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
            <p className="font-medium text-amber-900 dark:text-amber-200">Replace your ledger with “{pendingFile.name}”?</p>
            <p className="mt-1 text-amber-800 dark:text-amber-300">
              Everything currently in this ledger will be replaced by the backup. This can&apos;t be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className={buttonClass.danger} disabled={!!busy} onClick={() => restore(pendingFile)}>
                {busy === "restore" ? "Restoring…" : "Replace my ledger"}
              </button>
              <button type="button" className={buttonClass.secondary} onClick={() => setPendingFile(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
