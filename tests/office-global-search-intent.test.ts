import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("office-global-search intent", () => {
  it("exporta searchOffice", async () => {
    const mod = await import("../src/lib/office-global-search.js");
    assert.equal(typeof mod.searchOffice, "function");
  });
});
