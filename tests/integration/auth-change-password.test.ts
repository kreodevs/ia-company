import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma.js";
import { hashPassword } from "../../src/lib/auth.js";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("change password", { skip: !hasDb }, () => {
  const email = `admin-pwd-${Date.now()}@test.local`;
  let adminId = "";

  before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "integration-test-secret";

    const admin = await prisma.superAdmin.create({
      data: {
        email,
        name: "Password Test Admin",
        passwordHash: await hashPassword("oldpassword123"),
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

  it("superadmin can change password when authenticated", async () => {
    const { buildServer } = await import("../../src/server/index.js");
    const app = await buildServer();

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "oldpassword123" },
    });
    assert.equal(loginRes.statusCode, 200);
    const cookie = loginRes.headers["set-cookie"];

    const changeRes = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: cookie ? { cookie: String(cookie) } : {},
      payload: { currentPassword: "oldpassword123", password: "newpassword123" },
    });
    assert.equal(changeRes.statusCode, 200);

    const reloginOld = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "oldpassword123" },
    });
    assert.equal(reloginOld.statusCode, 401);

    const reloginNew = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "newpassword123" },
    });
    assert.equal(reloginNew.statusCode, 200);

    await app.close();
  });

  it("rejects wrong current password", async () => {
    const { buildServer } = await import("../../src/server/index.js");
    const app = await buildServer();

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "newpassword123" },
    });
    const cookie = loginRes.headers["set-cookie"];

    const changeRes = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: cookie ? { cookie: String(cookie) } : {},
      payload: { currentPassword: "wrong-password", password: "anotherpassword123" },
    });
    assert.equal(changeRes.statusCode, 401);

    await app.close();
  });
});

describe("tenant change password", { skip: !hasDb }, () => {
  const slug = `pwd-tenant-${Date.now()}`;
  const email = `owner-${Date.now()}@test.local`;
  let tenantId = "";
  let userId = "";

  before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "integration-test-secret";

    const tenant = await prisma.tenant.create({
      data: { name: "Password Tenant", slug },
    });
    tenantId = tenant.id;

    const user = await prisma.tenantUser.create({
      data: {
        tenantId,
        email,
        name: "Owner",
        passwordHash: await hashPassword("tenantold123"),
        role: "owner",
      },
    });
    userId = user.id;
  });

  after(async () => {
    if (userId) {
      await prisma.tenantUser.delete({ where: { id: userId } }).catch(() => undefined);
    }
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("tenant user can change password when authenticated", async () => {
    const { buildServer } = await import("../../src/server/index.js");
    const app = await buildServer();

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/tenant/login",
      payload: { tenantSlug: slug, email, password: "tenantold123" },
    });
    assert.equal(loginRes.statusCode, 200);
    const cookie = loginRes.headers["set-cookie"];

    const changeRes = await app.inject({
      method: "POST",
      url: "/api/auth/tenant/change-password",
      headers: cookie ? { cookie: String(cookie) } : {},
      payload: { currentPassword: "tenantold123", password: "tenantnew123" },
    });
    assert.equal(changeRes.statusCode, 200);

    const reloginNew = await app.inject({
      method: "POST",
      url: "/api/auth/tenant/login",
      payload: { tenantSlug: slug, email, password: "tenantnew123" },
    });
    assert.equal(reloginNew.statusCode, 200);

    await app.close();
  });
});
