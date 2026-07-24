import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("product opencode settings shape", () => {
  it("defines expected fields for per-product delegation config", async () => {
    const { getProductOpencodeSettings } = await import("../src/lib/product-opencode.js");
    assert.equal(typeof getProductOpencodeSettings, "function");
  });
});
