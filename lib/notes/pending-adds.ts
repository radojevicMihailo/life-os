import type { DraftStorage } from "./draft";
export type PendingAddition = { id: string; text: string };
type PendingAddSnapshot = { input: string; additions: PendingAddition[] };

/** Staged requests are uncertain until acknowledged. Restoring never resubmits. */
export function createPendingAddDraft(storage: DraftStorage, key: string) {
  let state: PendingAddSnapshot | undefined;
  let memoryOnly = false;
  function read(): PendingAddSnapshot {
    if (memoryOnly && state) return state;
    try {
      const raw = storage.getItem(key);
      if (raw === null) return state = { input: "", additions: [] };
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.input === "string" && parsed.input.length <= 1000 && Array.isArray(parsed.additions)) {
        const additions = parsed.additions.filter((item: unknown): item is PendingAddition => Boolean(item && typeof item === "object" && "id" in item && "text" in item && typeof item.id === "string" && typeof item.text === "string" && item.id.length <= 100 && item.text.length <= 1000));
        return state = { input: parsed.input, additions };
      }
    } catch {}
    return state ??= { input: "", additions: [] };
  }
  function write(next: PendingAddSnapshot) {
    state = next;
    try {
      if (!next.input && next.additions.length === 0) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(next));
      memoryOnly = false;
    } catch { memoryOnly = true; }
  }
  return {
    snapshot: () => { const current = read(); return { input: current.input, additions: current.additions.map((item) => ({ ...item })) }; },
    setInput(input: string) { write({ ...read(), input }); },
    stage(id: string, text: string) {
      const current = read();
      write({ ...current, additions: [...current.additions.filter((item) => item.id !== id), { id, text }] });
    },
    remove(id: string) { const current = read(); write({ ...current, additions: current.additions.filter((item) => item.id !== id) }); },
  };
}
