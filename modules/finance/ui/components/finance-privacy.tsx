"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

const PrivacyContext = createContext(false);

export function FinancePrivacy({ children, initiallyHidden = false }: { children: ReactNode; initiallyHidden?: boolean }) {
  const [hidden, setHidden] = useState(initiallyHidden);
  function toggle() {
    const next = !hidden;
    document.cookie = `finance-amounts-hidden=${next ? "1" : "0"}; Path=/finance; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setHidden(next);
  }
  const Icon = hidden ? Eye : EyeOff;
  return <PrivacyContext.Provider value={hidden}>
    <div data-finance-private={hidden ? "true" : "false"}>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={toggle} aria-pressed={hidden} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm text-slate-200 hover:bg-white/5">
          <Icon aria-hidden="true" className="size-4" />{hidden ? "Prikaži iznose" : "Sakrij iznose"}
        </button>
      </div>
      {hidden ? <p role="status" className="mb-4 text-xs text-slate-400">Finansijski iznosi su sakriveni. Unos, izmena i izvoz su skriveni dok ponovo ne prikažeš iznose.</p> : null}
      {children}
    </div>
  </PrivacyContext.Provider>;
}

export function FinancialValue({ children, className, title, "aria-label": ariaLabel }: { children: ReactNode; className?: string; title?: string; "aria-label"?: string }) {
  const hidden = useContext(PrivacyContext);
  return <span className={className} title={hidden ? undefined : title} aria-label={hidden ? "Finansijski podatak sakriven" : ariaLabel}>
    {hidden ? "••••" : children}
  </span>;
}

export function FinancialDetail({ children }: { children: ReactNode }) {
  return useContext(PrivacyContext) ? <p className="text-xs text-slate-500">••••</p> : children;
}
