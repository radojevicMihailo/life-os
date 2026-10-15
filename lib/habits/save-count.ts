/** Resolve optimistic state for both application errors and network failures. */
export async function saveHabitCount(
  previous: number,
  next: number,
  persist: () => Promise<{ ok: boolean; error?: string }>,
): Promise<{ count: number; error: string | null }> {
  try {
    const result = await persist();
    return result.ok ? { count: next, error: null } : { count: previous, error: result.error ?? "Čuvanje nije uspelo. Pokušaj ponovo." };
  } catch {
    return { count: previous, error: "Čuvanje nije uspelo. Proveri vezu i pokušaj ponovo." };
  }
}
