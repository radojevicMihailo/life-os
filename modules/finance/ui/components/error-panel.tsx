export function ErrorPanel({
  message = "Podaci trenutno nisu dostupni.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <section
      aria-live="polite"
      className="rounded-3xl border border-rose-300/20 bg-rose-300/10 p-5 text-rose-50"
      role="alert"
    >
      <h2 className="font-semibold">Nešto nije uspelo</h2>
      <p className="mt-2 text-sm leading-6 text-rose-100/80">{message}</p>
      {onRetry ? (
        <button
          className="mt-4 min-h-11 rounded-xl border border-rose-100/30 px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={onRetry}
          type="button"
        >
          Pokušaj ponovo
        </button>
      ) : null}
    </section>
  );
}
