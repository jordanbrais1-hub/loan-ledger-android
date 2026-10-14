"use client";

import { useSyncExternalStore } from "react";
import { getLocale, subscribeLocale, type Locale } from "@/lib/i18n";

/** The current language; re-renders the component when it changes. */
export function useLocale(): Locale {
  // The server (and the first client render) is always English; see restoreLocale.
  return useSyncExternalStore(subscribeLocale, getLocale, () => "en");
}
