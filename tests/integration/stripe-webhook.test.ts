import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { buildStripeTestSignature } from "../../src/lib/product-revenue.js";
import { runGuardMessage } from "../../src/lib/run-guards.js";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("run-guards messages", () => {
  it("returns human-readable block reasons", () => {
    assert.match(runGuardMessage("ACTIVE_RUN"), /already running/i);
    assert.match(runGuardMessage("PENDING_DECISIONS"), /GO\/NO-GO/i);
  });
});

describe("stripe webhook route", { skip: !hasDb }, () => {
  before(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-for-integration";
  });

  it("accepts raw JSON body with valid Stripe signature", async () => {
    const { buildServer } = await import("../../src/server/index.js");
    const app = await buildServer();

    const payload = Buffer.from(
      JSON.stringify({
        type: "checkout.session.completed",
        data: { object: { amount_total: 2500 } },
      }),
    );
    const secret = "whsec_test_secret";
    const signature = buildStripeTestSignature(payload, secret);

    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/stripe/nonexistent-product",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      payload,
    });

    assert.equal(res.statusCode, 404);
    await app.close();
  });
});
