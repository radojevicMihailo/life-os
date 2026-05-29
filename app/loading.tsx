export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md border bg-card" />
        ))}
      </div>
    </div>
  );
}
