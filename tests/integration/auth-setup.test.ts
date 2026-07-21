import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma.js";
import { hashPassword } from "../../src/lib/auth.js";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("superadmin auth", { skip: !hasDb }, () => {
  const email = `admin-${Date.now()}@test.local`;
  let adminId = "";

  before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "integration-test-secret";

    const admin = await prisma.superAdmin.create({
      data: {
        email,
        name: "Test Admin",
        passwordHash: await hashPassword("password12345"),
      },
    });
    adminId = admin.id;
  });

  after(async () => {
    if (adminId) {
      await prisma.superAdmin.delete({ where: { id: adminId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("logs in with valid credentials", async () => {
    const { buildServer } = await import("../../src/server/index.js");
    const app = await buildServer();

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "password12345" },
    });
    assert.equal(loginRes.statusCode, 200);

    const cookie = loginRes.headers["set-cookie"];
    const statusRes = await app.inject({
      method: "GET",
      url: "/api/auth/status",
      headers: cookie ? { cookie: String(cookie) } : {},
    });
    const status = statusRes.json() as { authenticated: boolean; kind?: string };
    assert.equal(status.authenticated, true);
    assert.equal(status.kind, "superadmin");

    await app.close();
  });

  it("rejects invalid password", async () => {
    const { buildServer } = await import("../../src/server/index.js");
    const app = await buildServer();

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "wrong-password" },
    });
    assert.equal(loginRes.statusCode, 401);

    await app.close();
  });
});
