import { es } from "./i18n-es";

// The app is written in English; other languages map each English string to a
// translation. Anything missing falls back to English.

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const localeNames: Record<Locale, string> = { en: "English", es: "Español" };

const dictionaries: Record<Locale, Record<string, string> | null> = { en: null, es };
const intlLocales: Record<Locale, string> = { en: process.env.NEXT_PUBLIC_LOCALE || "en-US", es: "es-CR" };
const STORAGE_KEY = "loan-ledger:locale";

// Starts in English so the prerendered HTML and the first client render match;
// the saved choice is applied right after (see `restoreLocale`).
let active: Locale = "en";
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return active;
}

/** The locale for Intl number and date formatting, e.g. "es-CR". */
export function intlLocale(): string {
  return intlLocales[active];
}

export function setLocale(locale: Locale) {
  active = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: the choice lasts until the app closes.
  }
  document.documentElement.lang = locale;
  listeners.forEach((notify) => notify());
}

/** Applies the saved language, or the phone's language the first time. */
export function restoreLocale() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Fall through to the device language.
  }
  const preferred = LOCALES.find((l) => l === saved) ?? (/^es\b/i.test(navigator.language) ? "es" : "en");
  if (preferred !== active) setLocale(preferred);
  else document.documentElement.lang = active;
}

/** Calls `listener` whenever the language changes; returns an unsubscribe function. */
export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Translates an English string. `{name}` placeholders are filled from `vars`.
 * Always pass a string literal, so the translation check in i18n.test.ts can find it.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  const translated = dictionaries[active]?.[text] ?? text;
  if (!vars) return translated;
  return translated.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
