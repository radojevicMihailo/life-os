"use client";

import type { ActionResult } from "../forms/action-result";

export function ActionMessage({ state, success = "Sačuvano." }: { state: ActionResult<unknown> | undefined; success?: string }) {
  if (!state) return null;
  const fields = state.ok ? [] : Object.entries(state.fields ?? {});
  return (
    <div aria-live="polite" className={`mt-3 text-sm ${state.ok ? "text-teal-200" : "text-rose-200"}`}>
      <p>{state.ok ? success : state.message}</p>
      {fields.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5">{fields.map(([field, message]) => <li id={`field-error-${field}`} key={field}>{message}</li>)}</ul> : null}
    </div>
  );
}

export function fieldErrorProps(state: ActionResult<unknown> | undefined, field: string) {
  const invalid = Boolean(state && !state.ok && state.fields?.[field]);
  return invalid ? { "aria-describedby": `field-error-${field}`, "aria-invalid": true as const } : {};
}
