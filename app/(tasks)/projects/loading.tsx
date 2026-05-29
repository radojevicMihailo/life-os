export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md border bg-card" />
        ))}
      </div>
    </div>
  );
}
