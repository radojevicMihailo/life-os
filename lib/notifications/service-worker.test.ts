import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
function worker() {
  const handlers = new Map<string, (e: Record<string, unknown>) => void>();
  const notifications: { title: string; options: Record<string, unknown> }[] = [];
  const opened: string[] = [];
  const context = {
    URL,
    self: {
      location: { origin: "https://life-os.example" },
      addEventListener: (name: string, handler: (e: Record<string, unknown>) => void) => handlers.set(name, handler),
      skipWaiting: async () => {},
      registration: { showNotification: async (title: string, options: Record<string, unknown>) => { notifications.push({ title, options }); } },
      clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (url: string) => { opened.push(url); } },
    },
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), context);
  async function dispatch(name: string, event: Record<string, unknown>) {
    let work: Promise<unknown> | undefined;
    handlers.get(name)!({ ...event, waitUntil: (promise: Promise<unknown>) => { work = promise; } });
    await work;
  }
  return { dispatch, notifications, opened };
}
describe("push service worker", () => {
  it("displays a visible notification with a safe task destination", async () => {
    const w = worker();
    await w.dispatch("push", { data: { json: () => ({ title: "Life OS", body: "Call", tag: "call", url: "/tasks/a" }) } });
    expect(w.notifications[0]).toMatchObject({ title: "Life OS", options: { body: "Call", tag: "call", data: { url: "https://life-os.example/tasks/a" } } });
    await w.dispatch("notificationclick", { notification: { close() {}, data: { url: "https://life-os.example/tasks/a" } } });
    expect(w.opened).toEqual(["https://life-os.example/tasks/a"]);
  });
  it("still displays malformed pushes and never opens a foreign URL", async () => {
    const w = worker();
    await w.dispatch("push", { data: { json: () => { throw new Error("malformed"); } } });
    expect(w.notifications).toHaveLength(1);
    await w.dispatch("notificationclick", { notification: { close() {}, data: { url: "https://attacker.example" } } });
    expect(w.opened).toEqual(["https://life-os.example/calendar"]);
  });
});
