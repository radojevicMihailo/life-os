import { jwtVerify, SignJWT, type JWTPayload } from "jose";

import { env } from "../config/env";
import { AuthError } from "./origin";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_PATH } from "./constants";

export { SESSION_COOKIE_NAME } from "./constants";

export interface SessionClaims {
  accessVersion: number;
  exp: number;
  iat: number;
}

export interface SessionInput {
  accessVersion: number;
}

export interface SessionCookie {
  httpOnly: true;
  maxAge: number;
  name: string;
  path: "/";
  sameSite: "lax";
  secure: true;
  value: string;
}

export interface SessionIssueResult {
  cookie: SessionCookie;
}

export interface SessionOptions {
  now?: Date;
  signingSecret?: string;
  ttlSeconds?: number;
}

export interface RequireWebSessionInput {
  cookieHeader?: string | null;
}

export interface RequireWebSessionOptions {
  currentAccessVersion?: number | (() => Promise<number>);
  now?: Date;
  signingSecret?: string;
}

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 180;
const allowedPayloadKeys = new Set(["accessVersion", "exp", "iat"]);

function signingKey(secret: string) {
  return new TextEncoder().encode(secret);
}

function requireSigningSecret(options?: Pick<SessionOptions, "signingSecret">) {
  return options?.signingSecret ?? env.SESSION_SIGNING_SECRET;
}

function requireAccessVersion(accessVersion: number) {
  if (!Number.isInteger(accessVersion) || accessVersion < 1) {
    throw new Error("invalid_access_version");
  }
}

function hasOnlySessionClaims(payload: JWTPayload) {
  return Object.keys(payload).every((key) => allowedPayloadKeys.has(key));
}

function toSessionClaims(payload: JWTPayload): SessionClaims | null {
  const { accessVersion, exp, iat } = payload;

  if (
    !hasOnlySessionClaims(payload) ||
    typeof accessVersion !== "number" ||
    typeof exp !== "number" ||
    typeof iat !== "number" ||
    !Number.isInteger(accessVersion) ||
    !Number.isInteger(iat) ||
    !Number.isInteger(exp)
  ) {
    return null;
  }

  return {
    accessVersion,
    exp,
    iat,
  };
}

function sessionTokenFromCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name === SESSION_COOKIE_NAME) {
      return valueParts.join("=") || null;
    }
  }

  return null;
}

async function defaultCurrentAccessVersion() {
  const { readWebAccessSetting } = await import("./settings");

  return (await readWebAccessSetting()).accessVersion;
}

async function resolveCurrentAccessVersion(
  currentAccessVersion: RequireWebSessionOptions["currentAccessVersion"],
) {
  if (typeof currentAccessVersion === "number") {
    return currentAccessVersion;
  }

  if (currentAccessVersion) {
    return currentAccessVersion();
  }

  return defaultCurrentAccessVersion();
}

export async function issueSession(
  input: SessionInput,
  options?: SessionOptions,
): Promise<SessionIssueResult> {
  requireAccessVersion(input.accessVersion);

  const now = options?.now ?? new Date();
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1_000);
  const value = await new SignJWT({ accessVersion: input.accessVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(signingKey(requireSigningSecret(options)));

  return {
    cookie: {
      httpOnly: true,
      maxAge: ttlSeconds,
      name: SESSION_COOKIE_NAME,
      path: SESSION_COOKIE_PATH,
      sameSite: "lax",
      secure: true,
      value,
    },
  };
}

export async function verifySession(
  token: string,
  options?: Pick<SessionOptions, "now" | "signingSecret">,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(requireSigningSecret(options)), {
      algorithms: ["HS256"],
      currentDate: options?.now,
    });

    return toSessionClaims(payload);
  } catch {
    return null;
  }
}

export async function requireWebSession(
  input: Request | RequireWebSessionInput,
  options?: RequireWebSessionOptions,
): Promise<SessionClaims> {
  const cookieHeader =
    input instanceof Request ? input.headers.get("cookie") : input.cookieHeader;
  const token = sessionTokenFromCookieHeader(cookieHeader);

  if (!token) {
    throw new AuthError("unauthorized");
  }

  const session = await verifySession(token, {
    now: options?.now,
    signingSecret: options?.signingSecret,
  });

  if (!session) {
    throw new AuthError("unauthorized");
  }

  const currentAccessVersion = await resolveCurrentAccessVersion(
    options?.currentAccessVersion,
  );

  if (session.accessVersion !== currentAccessVersion) {
    throw new AuthError("unauthorized");
  }

  return session;
}

export function expiredSessionCookie(): SessionCookie & { maxAge: 0; value: "" } {
  return {
    httpOnly: true,
    maxAge: 0,
    name: SESSION_COOKIE_NAME,
    path: SESSION_COOKIE_PATH,
    sameSite: "lax",
    secure: true,
    value: "",
  };
}
