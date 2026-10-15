import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-10 text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children ? (
        <div className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          {children}
        </div>
      ) : null}
    </section>
  );
}
