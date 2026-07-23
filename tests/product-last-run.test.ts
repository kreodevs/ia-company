import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("product last run trace", () => {
  it("exports getProductLastRunTrace from lib", async () => {
    const mod = await import("../src/lib/product-last-run.js");
    assert.equal(typeof mod.getProductLastRunTrace, "function");
  });
});
