"use client";

import { useEffect, useSyncExternalStore } from "react";
import { mainSections } from "@/components/main-sections";

const key = "life-os-appearance";
const defaults = JSON.stringify({ compact: false, favorites: ["/tasks", "/meals"] });
type Appearance = { compact: boolean; favorites: string[] };
const validPaths = new Set(["/tasks", ...mainSections.map((item) => item.href)]);
function snapshot() { try { return localStorage.getItem(key) ?? defaults; } catch { return defaults; } }
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener(key, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(key, callback); };
}
export function useAppearance(): Appearance {
  const raw = useSyncExternalStore(subscribe, snapshot, () => defaults);
  try {
    const value = JSON.parse(raw);
    return { compact: value.compact === true, favorites: Array.isArray(value.favorites) ? [...new Set<string>(value.favorites.filter((path: unknown) => typeof path === "string" && validPaths.has(path)))].slice(0, 3) : ["/tasks", "/meals"] };
  } catch { return { compact: false, favorites: ["/tasks", "/meals"] }; }
}
function save(value: Appearance) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage may be disabled. */ }
  window.dispatchEvent(new Event(key));
}
export function AppearanceProvider() {
  const { compact } = useAppearance();
  useEffect(() => { document.documentElement.dataset.density = compact ? "compact" : "comfortable"; }, [compact]);
  return null;
}
export function AppearanceSettings() {
  const appearance = useAppearance();
  const choices = [{ href: "/tasks", label: "Lista zadataka" }, ...mainSections];
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5" aria-labelledby="appearance-title">
    <div><h2 id="appearance-title" className="text-lg font-semibold">Izgled i brzi pristup</h2><p className="mt-1 text-sm text-muted-foreground">Izbor se pamti na ovom uređaju.</p></div>
    <div className="flex flex-wrap gap-2">{[{ compact: false, label: "Prostran prikaz" }, { compact: true, label: "Kompaktan prikaz" }].map((item) => <button type="button" key={item.label} aria-pressed={appearance.compact === item.compact} onClick={() => save({ ...appearance, compact: item.compact })} className={`min-h-11 rounded-xl border px-4 text-sm ${appearance.compact === item.compact ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>{item.label}</button>)}</div>
    <fieldset><legend className="mb-2 text-sm font-medium">Omiljene oblasti na telefonu · najviše 3</legend><div className="flex flex-wrap gap-2">{choices.map((item) => {
      const selected = appearance.favorites.includes(item.href);
      return <button type="button" key={item.href} aria-pressed={selected} disabled={!selected && appearance.favorites.length === 3} onClick={() => save({ ...appearance, favorites: selected ? appearance.favorites.filter((href) => href !== item.href) : [...appearance.favorites, item.href] })} className={`min-h-11 rounded-xl border px-3 text-sm disabled:opacity-40 ${selected ? "border-primary bg-primary/15" : "border-border text-muted-foreground"}`}>{item.label}</button>;
    })}</div></fieldset>
  </section>;
}
