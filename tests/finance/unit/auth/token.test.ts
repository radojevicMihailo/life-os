import { describe, expect, it } from "vitest";

import { hashOpaqueToken, verifyOpaqueToken } from "@/modules/finance/auth/token";

const pepper = "deployment-pepper";

describe("opaque access token hashing", () => {
  it("verifies a raw token against its peppered SHA-256 hash", async () => {
    expect(await verifyOpaqueToken("test-token", await hashOpaqueToken("test-token", { pepper }), { pepper })).toBe(true);
  });

  it("uses the deployment pepper as part of the stored digest", async () => {
    await expect(hashOpaqueToken("test-token", { pepper })).resolves.toBe(
      "sha256:pT5YgH5tMfMupZzX2kNft7k1RCXSwEEcW0t7w36l8AA",
    );
    await expect(
      verifyOpaqueToken("test-token", "sha256:pT5YgH5tMfMupZzX2kNft7k1RCXSwEEcW0t7w36l8AA", {
        pepper: "different-pepper",
      }),
    ).resolves.toBe(false);
  });

  it("rejects wrong or malformed token hashes", async () => {
    const hash = await hashOpaqueToken("test-token", { pepper });

    await expect(verifyOpaqueToken("other-token", hash, { pepper })).resolves.toBe(false);
    await expect(verifyOpaqueToken("test-token", "sha256:not-base64url", { pepper })).resolves.toBe(false);
    await expect(verifyOpaqueToken("test-token", "not-a-versioned-hash", { pepper })).resolves.toBe(false);
  });
});
