import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashPassword,
  resolveEffectiveTenantId,
  verifyPassword,
  type SessionPayload,
} from "../src/lib/auth.js";

describe("auth helpers", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("secure-password-123");
    assert.notEqual(hash, "secure-password-123");
    assert.equal(await verifyPassword("secure-password-123", hash), true);
    assert.equal(await verifyPassword("wrong-password", hash), false);
  });

  it("resolves tenant id for tenant sessions", () => {
    const session: SessionPayload = {
      kind: "tenant",
      sub: "user-1",
      email: "user@example.com",
      name: "User",
      tenantId: "tenant-abc",
      tenantSlug: "acme",
      tenantRole: "member",
      impersonatedTenantId: null,
    };
    assert.equal(resolveEffectiveTenantId(session), "tenant-abc");
  });

  it("resolves impersonated tenant for superadmin", () => {
    const session: SessionPayload = {
      kind: "superadmin",
      sub: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      tenantId: null,
      impersonatedTenantId: "tenant-xyz",
    };
    assert.equal(resolveEffectiveTenantId(session), "tenant-xyz");
  });
});
