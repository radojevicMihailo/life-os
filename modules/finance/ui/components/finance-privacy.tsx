"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

const PrivacyContext = createContext({ hidden: false, toggle: () => {} });

// Visibility lasts for this open application session. A reload starts hidden.
export function FinancePrivacyProvider({ children, initiallyHidden = true }: { children: ReactNode; initiallyHidden?: boolean }) {
  const [hidden, setHidden] = useState(initiallyHidden);
  return <PrivacyContext.Provider value={{ hidden, toggle: () => setHidden((value) => !value) }}>
    {children}
  </PrivacyContext.Provider>;
}

export function FinancePrivacyToggle() {
  const { hidden, toggle } = useContext(PrivacyContext);
  const Icon = hidden ? Eye : EyeOff;
  return <button type="button" onClick={toggle} aria-pressed={hidden} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/30 px-4 text-sm text-foreground hover:bg-accent/50">
    <Icon aria-hidden="true" className="size-4" />{hidden ? "Prikaži iznose" : "Sakrij iznose"}
  </button>;
}

export function FinancePrivacy({ children }: { children: ReactNode }) {
  const { hidden } = useContext(PrivacyContext);
  return <div data-finance-private={hidden ? "true" : "false"}>
    <div className="mb-4 flex justify-end"><FinancePrivacyToggle /></div>
    {hidden ? <p role="status" className="mb-4 text-xs text-muted-foreground">Finansijski iznosi su sakriveni. Unos, izmena i izvoz su skriveni dok ponovo ne prikažeš iznose.</p> : null}
    {children}
  </div>;
}

export function FinancialValue({ children, className, title, "aria-label": ariaLabel }: { children: ReactNode; className?: string; title?: string; "aria-label"?: string }) {
  const { hidden } = useContext(PrivacyContext);
  return <span className={className} title={hidden ? undefined : title} aria-label={hidden ? "Finansijski podatak sakriven" : ariaLabel}>
    {hidden ? "••••" : children}
  </span>;
}

export function FinancialDetail({ children }: { children: ReactNode }) {
  return useContext(PrivacyContext).hidden ? <p className="text-xs text-muted-foreground">••••</p> : children;
}
