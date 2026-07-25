import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { buildStripeTestSignature } from "../src/lib/product-revenue.js";
import { buildWaitlistWebhookUrl } from "../src/lib/product-serializer.js";

describe("product revenue", () => {
  it("extracts USD from Stripe checkout session object shape", () => {
    const amount = (object: Record<string, unknown>) => {
      const cents =
        typeof object.amount_total === "number"
          ? object.amount_total
          : typeof object.amount_received === "number"
            ? object.amount_received
            : typeof object.amount === "number"
              ? object.amount
              : 0;
      return cents > 0 ? Math.round((cents / 100) * 100) / 100 : 0;
    };

    assert.equal(amount({ amount_total: 1900 }), 19);
    assert.equal(amount({ amount_received: 5000 }), 50);
    assert.equal(amount({ amount: 999 }), 9.99);
    assert.equal(amount({}), 0);
  });

  it("builds verifiable Stripe test signatures", () => {
    const payload = Buffer.from(
      JSON.stringify({ id: "evt_test", type: "checkout.session.completed" }),
    );
    const secret = "whsec_test_secret";
    const timestamp = 1_700_000_000;
    const signature = buildStripeTestSignature(payload, secret, timestamp);

    assert.match(signature, /^t=\d+,v1=[a-f0-9]+$/);
    const v1 = signature.split("v1=")[1]!;
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${payload.toString("utf8")}`)
      .digest("hex");
    assert.equal(v1, expected);
  });

  it("builds waitlist webhook URLs from public API base", () => {
    const url = buildWaitlistWebhookUrl("prod_123", "https://api.example.com/api");
    assert.equal(url, "https://api.example.com/api/webhooks/waitlist/prod_123");
  });
});
