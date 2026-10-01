// Schedule after completion, so slow provider requests can never overlap a tick.
export function startReminderScheduler(tick: () => Promise<void>, onError: () => void = () => console.error("[push] reminder tick failed")) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  function schedule(delay: number) {
    timer = setTimeout(async () => {
      try { await tick(); } catch { onError(); }
      finally { if (!stopped) schedule(60000); }
    }, delay);
    timer.unref?.();
  }
  schedule(1000);
  return () => { stopped = true; clearTimeout(timer); };
}
