"use client";

import { ErrorPanel } from "@/modules/finance/ui/components/error-panel";
import { unstable_isUnrecognizedActionError } from "next/navigation";

export default function ProtectedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  if (unstable_isUnrecognizedActionError(error)) {
    return (
      <ErrorPanel
        message="Aplikacija je ažurirana. Zahtev nije izvršen. Osveži aplikaciju, pa ponovo unesi i pošalji podatke."
        retryLabel="Osveži aplikaciju"
        onRetry={() => window.location.reload()}
      />
    );
  }
  return (
    <ErrorPanel
      message="Čitanje finansijskih podataka nije uspelo. Nijedan podatak nije promenjen."
      onRetry={reset}
    />
  );
}
