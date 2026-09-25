import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { idempotencyRecords } from "../db/schema";
import type { UnitOfWork } from "../db/unit-of-work";
import type { ApplicationDependencies } from "./ports";

type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("idempotency_request_not_json");
    }

    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);

    return `{${entries.join(",")}}`;
  }

  throw new TypeError("idempotency_request_not_json");
}

export function canonicalizeJson(value: JsonValue): string {
  return canonicalJson(value);
}

export function fingerprint(value: JsonValue): string {
  return createHash("sha256").update(canonicalizeJson(value), "utf8").digest("hex");
}

export class IdempotencyConflictError extends Error {
  readonly code = "idempotency_conflict";

  constructor() {
    super("idempotency_conflict");
    this.name = "IdempotencyConflictError";
  }
}

export interface IdempotencyWorkResult<ResponseBody> {
  response: ResponseBody;
  resultTransactionId: string;
}

export interface ExecuteIdempotentlyInput<ResponseBody> {
  key: string;
  request: JsonValue;
  scope: string;
  work(
    transactionalDependencies: ApplicationDependencies,
  ): Promise<IdempotencyWorkResult<ResponseBody>>;
}

export interface IdempotencyExecution<ResponseBody> {
  replayed: boolean;
  response: ResponseBody;
}

export async function executeIdempotently<ResponseBody>(
  deps: ApplicationDependencies,
  input: ExecuteIdempotentlyInput<ResponseBody>,
): Promise<IdempotencyExecution<ResponseBody>> {
  const scope = input.scope.trim();
  const key = input.key.trim();

  if (!scope || !key) {
    throw new TypeError("idempotency_scope_and_key_required");
  }

  const requestFingerprint = fingerprint(input.request);

  return deps.unitOfWork.run(async (tx) => {
    const lockIdentity = canonicalizeJson([scope, key]);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${lockIdentity}, 0))`,
    );

    const [existing] = await tx
      .select()
      .from(idempotencyRecords)
      .where(
        and(
          eq(idempotencyRecords.scope, scope),
          eq(idempotencyRecords.key, key),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new IdempotencyConflictError();
      }

      if (existing.status !== "completed" || existing.responseBody === null) {
        throw new Error("idempotency_record_incomplete");
      }

      return {
        replayed: true,
        response: existing.responseBody as ResponseBody,
      };
    }

    const recordId = deps.ids.nextId("idempotencyRecord");
    const now = deps.clock.now();
    await tx.insert(idempotencyRecords).values({
      id: recordId,
      scope,
      key,
      requestFingerprint,
      status: "started",
      createdAt: now,
    });

    const transactionalDependencies: ApplicationDependencies = {
      ...deps,
      unitOfWork: {
        run: (work) => work(tx),
      } satisfies UnitOfWork,
    };
    const completed = await input.work(transactionalDependencies);

    await tx
      .update(idempotencyRecords)
      .set({
        completedAt: deps.clock.now(),
        responseBody: completed.response,
        resultTransactionId: completed.resultTransactionId,
        status: "completed",
      })
      .where(eq(idempotencyRecords.id, recordId));

    return {
      replayed: false,
      response: completed.response,
    };
  });
}
