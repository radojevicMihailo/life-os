export interface SourceMetadata {
  ageMs: number;
  effectiveAt: Date;
  manual: boolean;
  retrievedAt?: Date;
  source: string;
  stale: boolean;
}

export function SourceBadge({ metadata }: { metadata: SourceMetadata }) {
  const state = metadata.manual
    ? "Ručno"
    : metadata.stale
      ? "Zastarelo"
      : "Aktuelno";
  const stateClass = metadata.manual
    ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
    : metadata.stale
      ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
      : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";

  return (
    <span
      className={`inline-flex min-h-7 max-w-full flex-wrap items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${stateClass}`}
      title={`${metadata.source}; efektivno ${metadata.effectiveAt.toISOString()}`}
    >
      <span>{state}</span>
      <span aria-hidden="true">·</span>
      <span>{metadata.source}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={metadata.effectiveAt.toISOString()}>
        {metadata.effectiveAt.toLocaleDateString("sr-Latn-RS", {
          day: "2-digit",
          month: "2-digit",
          timeZone: "Europe/Belgrade",
          year: "numeric",
        })}
      </time>
    </span>
  );
}
