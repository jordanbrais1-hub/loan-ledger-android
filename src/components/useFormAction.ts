"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { FormState } from "@/lib/types";

/**
 * Wraps useActionState so the form keeps what the user typed when the server
 * returns validation errors (React resets forms after a plain `action` submit).
 */
export function useFormAction(action: (prev: FormState, data: FormData) => Promise<FormState>) {
  const [state, formAction, pending] = useActionState(action, {});

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return { state, onSubmit, pending };
}
