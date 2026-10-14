"use client";

import { useRef, useTransition, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { buttonClass } from "./ui";

/** A button that asks for confirmation in a dialog before running an action. */
export function ConfirmButton({
  action,
  title,
  message,
  confirmLabel,
  className = buttonClass.ghostDanger,
  children,
}: {
  action: () => Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button type="button" className={className} onClick={() => dialogRef.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      >
        <div className="p-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={buttonClass.secondary} onClick={() => dialogRef.current?.close()}>
              {t("Cancel")}
            </button>
            <button
              type="button"
              className={buttonClass.danger}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await action();
                  dialogRef.current?.close();
                })
              }
            >
              {pending ? t("Working…") : (confirmLabel ?? t("Delete"))}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
