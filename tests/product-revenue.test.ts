import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
});
