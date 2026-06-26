export default function Loading() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
