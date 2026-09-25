"use client";

import { ErrorPanel } from "@/modules/finance/ui/components/error-panel";

export default function ProtectedError({ reset }: { reset: () => void }) {
  return (
    <ErrorPanel
      message="Čitanje finansijskih podataka nije uspelo. Nijedan podatak nije promenjen."
      onRetry={reset}
    />
  );
}
