export default function ProtectedLoading() {
  return (
    <div aria-label="Učitavanje finansijskih podataka" aria-live="polite">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-36 animate-pulse rounded-3xl border border-border bg-muted/50"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
