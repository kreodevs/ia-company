import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRollingSessionSummary,
  ROLLING_SUMMARY_INTERVAL,
  shouldRefreshRollingSummary,
} from "../src/lib/session-memory.js";

describe("session memory — rolling summary", () => {
  it("refreshes only on multiples of the interval", () => {
    assert.equal(shouldRefreshRollingSummary(0), false);
    assert.equal(shouldRefreshRollingSummary(1), false);
    assert.equal(shouldRefreshRollingSummary(ROLLING_SUMMARY_INTERVAL - 1), false);
    assert.equal(shouldRefreshRollingSummary(ROLLING_SUMMARY_INTERVAL), true);
    assert.equal(shouldRefreshRollingSummary(ROLLING_SUMMARY_INTERVAL * 2), true);
    assert.equal(shouldRefreshRollingSummary(ROLLING_SUMMARY_INTERVAL * 2 + 1), false);
  });

  it("preserves the previous summary and appends recent work", () => {
    const summary = buildRollingSessionSummary("## Prior\nConsensus so far", [
      { turnNo: 6, input: "Read README", output: "Read the workspace README" },
      { turnNo: 7, input: "Write plan", output: "Wrote plan.md with three milestones" },
    ]);

    assert.match(summary, /## Previous session memory/);
    assert.match(summary, /Consensus so far/);
    assert.match(summary, /## Recent work/);
    assert.match(summary, /### Turn 6/);
    assert.match(summary, /### Turn 7/);
    assert.match(summary, /Wrote plan\.md with three milestones/);
  });

  it("keeps only the most recent five turns", () => {
    const turns = Array.from({ length: 8 }, (_, index) => ({
      turnNo: index + 1,
      input: `instruction-${index + 1}`,
      output: `output-${index + 1}`,
    }));

    const summary = buildRollingSessionSummary(null, turns);

    assert.doesNotMatch(summary, /instruction-3/);
    assert.match(summary, /### Turn 4/);
    assert.match(summary, /### Turn 8/);
  });

  it("handles turns without textual output", () => {
    const summary = buildRollingSessionSummary(null, [
      { turnNo: 1, input: "call shell", output: null },
    ]);

    assert.match(summary, /### Turn 1/);
    assert.match(summary, /\(no textual output\)/);
  });

  it("truncates oversized output", () => {
    const huge = "x".repeat(10_000);
    const summary = buildRollingSessionSummary(null, [
      { turnNo: 1, input: "do work", output: huge },
    ]);

    assert.match(summary, /\.\.\. \[truncated\]/);
    assert.ok(summary.length < huge.length);
  });

  it("omits the previous-memory block when there is no prior summary", () => {
    const summary = buildRollingSessionSummary(null, [
      { turnNo: 1, input: "start", output: "started" },
    ]);

    assert.doesNotMatch(summary, /## Previous session memory/);
    assert.match(summary, /## Recent work/);
  });
});