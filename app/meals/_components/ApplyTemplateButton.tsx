"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { applyTemplateToDay } from "../_actions/templates";

export function ApplyTemplateButton({ templateId }: { templateId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  function applyToday() {
    setError(null);
    start(async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await applyTemplateToDay(templateId, today);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/meals/${today}`);
      router.refresh();
    });
  }
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={applyToday} disabled={pending}>
        {pending ? "Adding…" : "Add to today"}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
