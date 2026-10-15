import type { ReactNode } from "react";

/** Native disclosure keeps forms mounted, including their unsaved input. */
export function ExpandableForm({ label, description, children }: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-border bg-card">
      <summary className="min-h-11 cursor-pointer rounded-2xl px-4 py-3 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {label}
      </summary>
      <div className="px-3 pb-3">
        {description ? <p className="mb-3 px-1 text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </div>
    </details>
  );
}
