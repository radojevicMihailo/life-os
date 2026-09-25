import { env } from "../config/env";

export class AuthError extends Error {
  constructor(readonly code: "invalid_origin" | "unauthorized") {
    super(code);
    this.name = "AuthError";
  }
}

export interface SameOriginOptions {
  appOrigin?: string;
}

function canonicalOrigin(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const defaultPort =
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80");
  const port = url.port && !defaultPort ? `:${url.port}` : "";

  return `${url.protocol}//${url.hostname.toLowerCase()}${port}`;
}

export function requireSameOrigin(
  request: Request,
  options?: SameOriginOptions,
): void {
  const requestOrigin = request.headers.get("origin");
  const actual = requestOrigin ? canonicalOrigin(requestOrigin) : null;
  const expected = canonicalOrigin(options?.appOrigin ?? env.APP_ORIGIN);

  if (!actual || !expected || actual !== expected) {
    throw new AuthError("invalid_origin");
  }
}
