import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-10 text-center">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      {children ? (
        <div className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
          {children}
        </div>
      ) : null}
    </section>
  );
}
