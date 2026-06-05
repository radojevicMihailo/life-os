"use client";

import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollToTopButton() {
  return (
    <div className="flex justify-center pt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp className="mr-2 h-4 w-4" /> Back to top
      </Button>
    </div>
  );
}
