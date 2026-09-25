export default function ProtectedLoading() {
  return (
    <div aria-label="Učitavanje finansijskih podataka" aria-live="polite">
      <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded-xl bg-white/10" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
