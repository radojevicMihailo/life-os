export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type DraftRecovery<T> = { value: T; conflict: boolean };

// Access is deferred until a client event/effect; restricted browser storage must
// never prevent the actual server save from running.
export const browserDraftStorage: DraftStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

export function createDraftStore<T>(storage: DraftStorage, key: string, initial: T, isValue: (value: unknown) => value is T) {
  let base = initial;
  const equal = (left: T, right: T) => JSON.stringify(left) === JSON.stringify(right);
  function read(): { base: T; value: T } | null {
    try {
      const raw = storage.getItem(key);
      const draft: unknown = raw ? JSON.parse(raw) : null;
      if (!draft || typeof draft !== "object" || !("base" in draft) || !("value" in draft) || !isValue(draft.base) || !isValue(draft.value)) return null;
      return { base: draft.base, value: draft.value };
    } catch { return null; }
  }
  function discard() { try { storage.removeItem(key); } catch {} }
  function write(value: T) { try { storage.setItem(key, JSON.stringify({ base, value })); } catch {} }
  return {
    persist: write,
    discard,
    recover(): DraftRecovery<T> | null {
      const draft = read();
      if (!draft) return null;
      if (equal(draft.value, initial)) { discard(); return null; }
      return { value: draft.value, conflict: !equal(draft.base, initial) };
    },
    saved(value: T) {
      base = value;
      const draft = read();
      if (!draft) return;
      if (equal(draft.value, value)) discard();
      else write(draft.value);
    },
  };
}
