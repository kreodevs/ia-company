import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

describe("API health", () => {
  before(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-for-integration";
  });

  it("GET /api/health returns ok", async () => {
    const { buildServer } = await import("../../src/server/index.js");
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { status: string };
    assert.equal(body.status, "ok");
    await app.close();
  });
});
