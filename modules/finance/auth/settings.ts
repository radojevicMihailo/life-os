import { eq } from "drizzle-orm";

import { env } from "../config/env";
import type { Db } from "../db/client";
import { accessSettings } from "../db/schema";
import { hashOpaqueToken } from "./token";

export interface WebAccessSetting {
  accessVersion: number;
  tokenHash: string;
}

export interface ShortcutAccessSetting {
  tokenHash: string;
}

export function parseAccessVersion(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("invalid_access_version");
  }

  return parsed;
}

export function deploymentWebAccessSetting(): WebAccessSetting {
  return {
    accessVersion: env.ACCESS_TOKEN_VERSION,
    tokenHash: env.ACCESS_TOKEN_HASH,
  };
}

export async function readWebAccessSetting(database?: Db): Promise<WebAccessSetting> {
  const targetDatabase = database ?? (await import("../db/client")).db;
  const [setting] = await targetDatabase
    .select({
      tokenHash: accessSettings.tokenHash,
      version: accessSettings.version,
    })
    .from(accessSettings)
    .where(eq(accessSettings.kind, "web_access_token"))
    .limit(1);

  if (!setting) {
    return deploymentWebAccessSetting();
  }

  return {
    accessVersion: parseAccessVersion(setting.version),
    tokenHash: setting.tokenHash,
  };
}

export async function readShortcutAccessSetting(
  database?: Db,
): Promise<ShortcutAccessSetting> {
  const targetDatabase = database ?? (await import("../db/client")).db;
  const [setting] = await targetDatabase
    .select({ tokenHash: accessSettings.tokenHash })
    .from(accessSettings)
    .where(eq(accessSettings.kind, "shortcut_token"))
    .limit(1);

  return {
    tokenHash: setting?.tokenHash ?? env.SHORTCUT_TOKEN_HASH,
  };
}

export async function rotateAccessToken(
  database: Db,
  input: {
    kind: "web_access_token" | "shortcut_token";
    rawToken: string;
    pepper?: string;
    rotatedAt: Date;
    currentVersion?: number;
  },
) {
  const tokenHash = await hashOpaqueToken(input.rawToken, {
    ...(input.pepper ? { pepper: input.pepper } : {}),
  });
  return database.transaction(async (tx) => {
    const [current] = await tx.select({ version: accessSettings.version })
      .from(accessSettings)
      .where(eq(accessSettings.kind, input.kind))
      .for("update");
    const version = Math.max(
      current ? parseAccessVersion(current.version) : 0,
      input.currentVersion ?? 0,
    ) + 1;
    const [setting] = await tx.insert(accessSettings).values({
      id: `access-setting-${input.kind}`,
      kind: input.kind,
      tokenHash,
      version: String(version),
      rotatedAt: input.rotatedAt,
      createdAt: input.rotatedAt,
    }).onConflictDoUpdate({
      target: accessSettings.kind,
      set: { tokenHash, version: String(version), rotatedAt: input.rotatedAt },
    }).returning({ version: accessSettings.version });
    return { version: parseAccessVersion(setting?.version ?? String(version)) };
  });
}
