import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { mapApiError } from "../api-errors";
import type { ActionResult } from "../forms/action-result";
import { guardServerAction } from "./guard";

function fieldErrors(error: ZodError) {
  const flattened = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flattened).flatMap(([field, messages]) => {
      const first = Array.isArray(messages) ? messages[0] : undefined;
      return typeof first === "string" ? [[field, first]] : [];
    }),
  );
}

export async function executeAction<T>(
  work: () => Promise<T>,
  options?: { financial?: boolean; revalidate?: string[] },
  runtime: {
    guard: () => Promise<void>;
    revalidate: (path: string) => void;
  } = { guard: guardServerAction, revalidate: revalidatePath },
): Promise<ActionResult<T>> {
  let value: T;
  try {
    await runtime.guard();
    value = await work();
  } catch (error) {
    const mapped = mapApiError(error);
    const noWrite = options?.financial ? " Ništa nije upisano." : "";
    return {
      ok: false,
      code: mapped.body.error.code,
      message: `${mapped.body.error.message}${noWrite}`,
      ...(error instanceof ZodError ? { fields: fieldErrors(error) } : {}),
    };
  }
  for (const path of options?.revalidate ?? []) {
    try {
      runtime.revalidate(path);
    } catch {
      // The mutation has already committed. Cache refresh failure must not lie about persistence.
    }
  }
  return { ok: true, value };
}
