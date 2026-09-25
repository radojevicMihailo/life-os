import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "../config/env";

const HASH_PREFIX = "sha256:";
const SHA256_DIGEST_BYTES = 32;

export interface OpaqueTokenOptions {
  pepper?: string;
}

function requirePepper(options?: OpaqueTokenOptions) {
  const pepper = options?.pepper ?? env.ACCESS_TOKEN_PEPPER;

  if (pepper.length === 0) {
    throw new Error("access_token_pepper_required");
  }

  return pepper;
}

function digestOpaqueToken(rawToken: string, pepper: string) {
  return createHash("sha256")
    .update(pepper, "utf8")
    .update("\0")
    .update(rawToken, "utf8")
    .digest();
}

function decodeStoredHash(storedHash: string) {
  if (!storedHash.startsWith(HASH_PREFIX)) {
    return null;
  }

  try {
    const decoded = Buffer.from(storedHash.slice(HASH_PREFIX.length), "base64url");

    return decoded.length === SHA256_DIGEST_BYTES ? decoded : null;
  } catch {
    return null;
  }
}

export async function hashOpaqueToken(
  rawToken: string,
  options?: OpaqueTokenOptions,
): Promise<string> {
  return `${HASH_PREFIX}${digestOpaqueToken(rawToken, requirePepper(options)).toString("base64url")}`;
}

export async function verifyOpaqueToken(
  rawToken: string,
  storedHash: string,
  options?: OpaqueTokenOptions,
): Promise<boolean> {
  const candidate = digestOpaqueToken(rawToken, requirePepper(options));
  const expected = decodeStoredHash(storedHash);

  if (!expected) {
    timingSafeEqual(candidate, Buffer.alloc(SHA256_DIGEST_BYTES));
    return false;
  }

  return timingSafeEqual(candidate, expected);
}
