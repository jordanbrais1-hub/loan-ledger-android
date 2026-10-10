"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { type Account, devAccount, googleClientId, loadAccount, rememberAccount, signInWithGoogle, signOut } from "@/lib/auth";
import { closeLedger, openLedger } from "@/lib/db";
import { Nav } from "./Nav";
import { FormError, Loading, buttonClass } from "./ui";

const AccountContext = createContext<{ account: Account; signOut: () => Promise<void> } | null>(null);

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AuthGate>");
  return ctx;
}

/** Shows the sign-in screen until there's an account, then opens that account's ledger. */
export function AuthGate({ children }: { children: ReactNode }) {
  // undefined = still checking the device for a saved session; null = signed out.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [error, setError] = useState<string>();

  /** Opens the account's ledger, then lets the app render. */
  const enter = useCallback(async (next: Account | null) => {
    try {
      if (next) await openLedger(next.id);
      setAccount(next);
    } catch (e) {
      console.error(e);
      setError("Couldn't open your ledger on this device.");
    }
  }, []);

  // Restore the session saved on this device, if any.
  useEffect(() => {
    const saved = loadAccount();
    (saved ? openLedger(saved.id) : Promise.resolve()).then(
      () => setAccount(saved),
      (e) => {
        console.error(e);
        setError("Couldn't open your ledger on this device.");
      },
    );
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    closeLedger();
    setAccount(null);
  }, []);

  if (error) return <div className="mx-auto max-w-md p-6"><FormError message={error} /></div>;
  if (account === undefined) return <Loading />;
  if (!account) {
    return (
      <SignIn
        onSignedIn={(a) => {
          rememberAccount(a);
          return enter(a);
        }}
      />
    );
  }

  return (
    <AccountContext value={{ account, signOut: handleSignOut }}>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </AccountContext>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: (account: Account) => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const google = async () => {
    setPending(true);
    setError(undefined);
    try {
      await onSignedIn(await signInWithGoogle());
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      // Closing the account picker isn't an error worth shouting about.
      if (!/cancel/i.test(message)) {
        setError(navigator.onLine ? message : "You're offline. Connect to the internet once to sign in.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl font-semibold text-white">
          L
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Loan Ledger</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Keep track of money you lend and borrow. Your ledger is stored privately on this device and works offline.
        </p>

        <div className="mt-8 space-y-3 text-left">
          <FormError message={error} />
          <button
            type="button"
            onClick={google}
            disabled={pending || !googleClientId}
            className={`${buttonClass.secondary} w-full py-2.5`}
          >
            <GoogleIcon />
            {pending ? "Signing in…" : "Continue with Google"}
          </button>
          {!googleClientId && (
            <p className="text-center text-xs text-amber-700 dark:text-amber-400">
              Google sign-in isn&apos;t configured yet (NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID).
            </p>
          )}
          {devAccount && (
            <button type="button" onClick={() => onSignedIn(devAccount!)} className={`${buttonClass.ghostDanger} w-full`}>
              Skip sign-in (development only)
            </button>
          )}
        </div>
        <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
          You only need a connection the first time you sign in.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-4 w-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
