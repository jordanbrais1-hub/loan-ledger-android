/**
 * Google sign-in for an offline app.
 *
 * Signing in needs a connection once. After that the account is remembered on
 * the device, so the app opens straight to the ledger with no network. There
 * is no server: the account is used to pick which on-device ledger to open,
 * and signing out locks it again.
 */

import { t } from "./i18n";

export interface Account {
  /** Google's stable user id ("sub"). Also names this account's local database. */
  id: string;
  name: string | null;
  email: string | null;
  picture: string | null;
}

const STORAGE_KEY = "loan-ledger:account";

export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/**
 * Public web demo (NEXT_PUBLIC_DEMO_MODE=true): no sign-in at all. Each visitor's
 * ledger lives only in their own browser. Never enabled for the Android app.
 */
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const demoAccount: Account = { id: "demo", name: "Demo", email: null, picture: null };

/** Lets `next dev` run without Google credentials. Never offered in a release build. */
export const devAccount: Account | null =
  process.env.NODE_ENV === "development"
    ? { id: "dev-local", name: "Local test account", email: null, picture: null }
    : null;

export function loadAccount(): Account | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

export function rememberAccount(account: Account) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

let plugin: Promise<typeof import("@capgo/capacitor-social-login").SocialLogin> | null = null;

/** Loads and initializes the plugin on first use, so prerendering never touches it. */
function socialLogin() {
  plugin ??= import("@capgo/capacitor-social-login").then(async ({ SocialLogin }) => {
    await SocialLogin.initialize({ google: { webClientId: googleClientId, mode: "online" } });
    return SocialLogin;
  });
  // Don't cache a failure (e.g. no connection), so the next tap can retry.
  plugin.catch(() => (plugin = null));
  return plugin;
}

export async function signInWithGoogle(): Promise<Account> {
  if (!googleClientId) {
    throw new Error(t("Google sign-in isn't configured. Set NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.local."));
  }
  // No `scopes` option: email, profile and openid are the plugin's defaults, and passing
  // any scopes on Android requires a modified MainActivity ("You CANNOT use scopes…").
  const { result } = await (await socialLogin()).login({ provider: "google", options: {} });
  if (result.responseType !== "online" || !result.profile.id) {
    throw new Error(t("Google didn't return an account. Please try again."));
  }
  const { id, name, email, imageUrl } = result.profile;
  const account = { id, name, email, picture: imageUrl };
  rememberAccount(account);
  return account;
}

export async function signOut() {
  localStorage.removeItem(STORAGE_KEY);
  // Best effort: works offline too, the local session is what matters.
  if (googleClientId) {
    try {
      await (await socialLogin()).logout({ provider: "google" });
    } catch {
      // Already signed out of Google, or no connection.
    }
  }
}
