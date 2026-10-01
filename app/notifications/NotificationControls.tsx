"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "unsupported" | "install" | "blocked" | "unconfigured" | "ready" | "error";
function serverKey(value: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) out[i] = decoded.charCodeAt(i);
  return out;
}
function sameKey(subscription: PushSubscription, publicKey: string) {
  const key = subscription.options.applicationServerKey;
  if (!key) return false;
  const expected = serverKey(publicKey);
  const actual = new Uint8Array(key);
  return actual.length === expected.length && actual.every((byte, i) => byte === expected[i]);
}
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Sesija je istekla. Prijavi se ponovo.");
    if (response.status === 404 || response.status === 410) throw new Error("Pretplata je istekla. Ponovo uključi notifikacije.");
    throw new Error("Operacija nije uspela. Pokušaj ponovo.");
  }
  return response.json();
}
export function NotificationControls() {
  const [status, setStatus] = useState<Status>("loading");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const publicKey = useRef<string>("");

  useEffect(() => {
    let disposed = false;
    async function initialize() {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      if (isIOS && !standalone) { setStatus("install"); return; }
      if (!window.isSecureContext || !("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) { setStatus("unsupported"); return; }
      try {
        const config = await api("/api/push");
        if (disposed) return;
        if (!config.configured) { setStatus("unconfigured"); return; }
        publicKey.current = config.publicKey;
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const worker = await navigator.serviceWorker.ready;
        registration.current = worker;
        const subscription = await worker.pushManager.getSubscription();
        const active = subscription && Notification.permission === "granted" && sameKey(subscription, config.publicKey);
        // Restore server registration after browser reinstalls or a temporary database failure.
        if (active) await api("/api/push", "POST", subscription.toJSON());
        if (!disposed) { setEnabled(!!active); setStatus(Notification.permission === "denied" ? "blocked" : "ready"); }
      } catch (error) {
        if (!disposed) { setMessage(error instanceof Error ? error.message : "Notifikacije trenutno nisu dostupne."); setStatus("error"); }
      }
    }
    void initialize();
    return () => { disposed = true; };
  }, []);

  async function enable() {
    setBusy(true); setMessage("");
    try {
      // Request permission directly from the click, before network calls (required on iOS).
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus(permission === "denied" ? "blocked" : "ready"); return; }
      const worker = registration.current!;
      let subscription = await worker.pushManager.getSubscription();
      if (subscription && !sameKey(subscription, publicKey.current)) {
        await api("/api/push", "DELETE", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey(publicKey.current) });
      await api("/api/push", "POST", subscription.toJSON());
      setEnabled(true); setStatus("ready"); setMessage("Notifikacije su uključene na ovom uređaju.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Uključivanje nije uspelo."); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setMessage("");
    try {
      const subscription = await registration.current?.pushManager.getSubscription();
      if (subscription) {
        await api("/api/push", "DELETE", { endpoint: subscription.endpoint });
        setEnabled(false);
        await subscription.unsubscribe();
      }
      setEnabled(false); setMessage("Notifikacije su isključene na ovom uređaju.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Isključivanje nije uspelo."); }
    finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setMessage("");
    try {
      const subscription = await registration.current?.pushManager.getSubscription();
      if (!subscription) { setEnabled(false); throw new Error("Ponovo uključi notifikacije."); }
      await api("/api/push/test", "POST", { endpoint: subscription.endpoint });
      setMessage("Test je poslat ovom uređaju. Ako nema obaveštenja, proveri dozvole i Focus režim.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Test nije uspeo.";
      if (text.startsWith("Pretplata je istekla")) {
        setEnabled(false);
        await registration.current?.pushManager.getSubscription().then((s) => s?.unsubscribe()).catch(() => {});
      }
      setMessage(text);
    } finally { setBusy(false); }
  }
  return <div className="space-y-4 rounded-2xl border bg-card p-5">
    <h2 className="font-semibold">Ovaj uređaj</h2>
    {status === "loading" && <p>Provera notifikacija…</p>}
    {status === "install" && <p>Na iPhone-u ili iPad-u izaberi Share → Add to Home Screen, otvori Life OS preko nove ikone i ovde uključi notifikacije.</p>}
    {status === "unsupported" && <p>Ovaj browser ne podržava Web Push. Otvori Life OS preko HTTPS-a u Safari-ju, Chrome-u ili Firefox-u koji podržava notifikacije.</p>}
    {status === "blocked" && <p>Notifikacije su blokirane. Dozvoli ih za Life OS u podešavanjima browsera ili uređaja, pa ponovo otvori ovu stranicu.</p>}
    {status === "unconfigured" && <p>Life OS notifikacije još nisu aktivirane na serveru.</p>}
    {status === "ready" && <>
      <p>{enabled ? "Notifikacije su uključene na ovom uređaju." : "Notifikacije su isključene na ovom uređaju."}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void (enabled ? disable() : enable())}>{enabled ? "Isključi notifikacije" : "Uključi notifikacije"}</Button>
        {enabled && <Button variant="outline" disabled={busy} onClick={() => void test()}>Pošalji test</Button>}
      </div>
    </>}
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
    <p className="text-sm text-muted-foreground">Podsetnici stižu 30, 15 i 5 minuta pre zadatka ili događaja sa zadatim vremenom. Uključi ih posebno na svakom uređaju. Focus režim može utišati obaveštenja.</p>
  </div>;
}
