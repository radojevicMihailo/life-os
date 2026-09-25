import type { ApplicationDependencies } from "../application/ports";
import {
  executeShortcutTransaction,
  parseShortcutRequest,
} from "../application/shortcut";
import { verifyOpaqueToken } from "../auth/token";
import { apiError, mapApiError, type ApiErrorBody } from "./api-errors";

export interface ShortcutRouteDependencies {
  application: ApplicationDependencies;
  readTokenHash(): Promise<string>;
  tokenPepper?: string;
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  };
}

function json(body: object, status: number) {
  return Response.json(body, {
    headers: responseHeaders(),
    status,
  });
}

function errorResponse(error: { body: ApiErrorBody; status: number }) {
  return json(error.body, error.status);
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  const token = match?.[1];

  return token && token.length <= 4_096 ? token : null;
}

function idempotencyKey(request: Request) {
  const value = request.headers.get("Idempotency-Key")?.trim();

  return value && value.length <= 200 ? value : null;
}

export function createPostHandler(dependencies: ShortcutRouteDependencies) {
  return async function post(request: Request): Promise<Response> {
    const token = bearerToken(request);

    if (!token) {
      return errorResponse(apiError("unauthorized", 401));
    }

    try {
      const tokenHash = await dependencies.readTokenHash();
      const authenticated = await verifyOpaqueToken(token, tokenHash, {
        ...(dependencies.tokenPepper
          ? { pepper: dependencies.tokenPepper }
          : {}),
      });

      if (!authenticated) {
        return errorResponse(apiError("unauthorized", 401));
      }

      const key = idempotencyKey(request);

      if (!key) {
        return errorResponse(apiError("idempotency_key_required", 400));
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(apiError("validation_error", 400));
      }

      const shortcutRequest = parseShortcutRequest(body);
      const result = await executeShortcutTransaction(
        dependencies.application,
        {
          idempotencyKey: key,
          request: shortcutRequest,
        },
      );

      return json(result.response, 201);
    } catch (error) {
      return errorResponse(mapApiError(error));
    }
  };
}
