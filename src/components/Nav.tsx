"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "./AuthGate";
import { buttonClass } from "./ui";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/loans", label: "Loans" },
  { href: "/people", label: "People" },
];

export function Nav() {
  const pathname = usePathname();
  const { account } = useAccount();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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
          <span className="hidden sm:inline">New loan</span>
          <span className="sm:hidden">New</span>
        </Link>
        <Link
          href="/settings"
          aria-label="Account and backup"
          title="Account and backup"
          className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
            pathname.startsWith("/settings") ? "ring-2 ring-indigo-500" : ""
          }`}
        >
          {account.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote avatar; next/image needs a server to optimize
            <img src={account.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            (account.name ?? account.email ?? "?").charAt(0).toUpperCase()
          )}
        </Link>
      </div>
    </header>
  );
}
