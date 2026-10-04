import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("schedule-run-index", () => {
  it("módulo exporta loader", async () => {
    const mod = await import("../src/lib/schedule-run-index.js");
    assert.equal(typeof mod.loadRecentRunsByScheduleId, "function");
  });
});
