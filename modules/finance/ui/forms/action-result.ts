export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string; fields?: Record<string, string> };

export const EMPTY_ACTION_RESULT: ActionResult<never> | undefined = undefined;
