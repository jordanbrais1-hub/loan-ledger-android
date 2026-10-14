"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { demoMode } from "@/lib/auth";
import { LOCALES, localeNames, setLocale, t } from "@/lib/i18n";
import { useAccount } from "./AuthGate";
import { ConfirmButton } from "./ConfirmButton";
import { buttonClass } from "./ui";
import { useLocale } from "./useLocale";

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const links = [
    { href: "/", label: t("Dashboard") },
    { href: "/loans", label: t("Loans") },
    { href: "/people", label: t("People") },
  ];

  return (
    <header className="sticky top-0 z-20 pt-[env(safe-area-inset-top)] border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-sm text-white">L</span>
          <span className="hidden sm:inline">Loan Ledger</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium sm:px-3 ${
                isActive(l.href) && pathname !== "/loans/new"
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/loans/new" className={`${buttonClass.primary} px-3 py-1.5`}>
          <span aria-hidden>+</span>
          <span className="hidden sm:inline">{t("New loan")}</span>
          <span className="sm:hidden">{t("New")}</span>
        </Link>
        <ProfileMenu highlighted={pathname.startsWith("/settings")} />
      </div>
    </header>
  );
}

const menuItemBase =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800";
const menuItem = `${menuItemBase} text-slate-700 dark:text-slate-200`;

/** The avatar button: account details, language, backup and sign-out. */
function ProfileMenu({ highlighted }: { highlighted: boolean }) {
  const { account, signOut } = useAccount();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={t("Profile menu")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
          highlighted || open ? "ring-2 ring-indigo-500" : ""
        }`}
      >
        {account.picture ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar; next/image needs a server to optimize
          <img src={account.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          (account.name ?? account.email ?? "?").charAt(0).toUpperCase()
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 px-3 pt-1.5 pb-2.5 dark:border-slate-800">
            <p className="truncate text-sm font-medium">{demoMode ? t("Demo version") : (account.name ?? t("Signed in"))}</p>
            {account.email && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{account.email}</p>}
          </div>

          <p className="px-3 pt-2.5 pb-1 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {t("Language")}
          </p>
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={locale === l}
              lang={l}
              onClick={() => {
                setOpen(false);
                if (l !== locale) setLocale(l);
              }}
              className={menuItem}
            >
              <span aria-hidden className="w-4 text-indigo-600 dark:text-indigo-400">
                {locale === l ? "✓" : ""}
              </span>
              {localeNames[l]}
            </button>
          ))}

          <div className="my-1.5 border-t border-slate-200 dark:border-slate-800" />
          <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
            <span aria-hidden className="w-4" />
            {t("Account & backup")}
          </Link>
          {!demoMode && (
          <ConfirmButton
            action={signOut}
            title={t("Sign out?")}
            message={t("Your ledger stays saved on this device. Sign in with the same Google account to open it again.")}
            confirmLabel={t("Sign out")}
            className={`${menuItemBase} text-rose-600 dark:text-rose-400`}
          >
            <span aria-hidden className="w-4" />
            {t("Sign out")}
          </ConfirmButton>
          )}
        </div>
      )}
    </div>
  );
}
