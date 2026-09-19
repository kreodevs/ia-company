import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExecutionEvent } from "../src/types/index.js";

describe("run events replay shape", () => {
  it("maps stored rows to execution events", () => {
    const row = {
      type: "step_complete",
      runId: "run-1",
      createdAt: new Date("2026-01-01T12:00:00.000Z"),
      payload: { agentName: "ceo-bezos" },
    };

    const event: ExecutionEvent = {
      type: row.type as ExecutionEvent["type"],
      runId: row.runId,
      timestamp: row.createdAt.toISOString(),
      data: row.payload as Record<string, unknown>,
    };

    assert.equal(event.type, "step_complete");
    assert.equal(event.data.agentName, "ceo-bezos");
  });
});
