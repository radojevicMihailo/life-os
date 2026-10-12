export type AutosaveState = "saved" | "saving" | "error";

/** Debounce edits, serialize writes, and retain failed edits for retry. */
export function createAutosave<T>(save: (value: T) => Promise<void>, onState: (state: AutosaveState) => void) {
  let pending: { value: T } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<boolean> | undefined;

  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  async function writePending() {
    while (pending) {
      const snapshot = pending;
      pending = undefined;
      onState("saving");
      try {
        await save(snapshot.value);
      } catch {
        pending ??= snapshot;
        onState("error");
        return false;
      }
    }
    onState("saved");
    return true;
  }

  function flush(): Promise<boolean> {
    clearTimer();
    if (running) return running;
    if (!pending) return Promise.resolve(true);
    running = writePending().finally(() => { running = undefined; });
    return running;
  }

  return {
    schedule(value: T) {
      pending = { value };
      onState("saving");
      clearTimer();
      timer = setTimeout(() => { void flush(); }, 500);
    },
    flush,
  };
}
