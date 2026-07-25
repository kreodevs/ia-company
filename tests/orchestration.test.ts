import test from "node:test";
import assert from "node:assert/strict";
import { computeNextRunAt, normalizeIntervalSec } from "../src/lib/schedule-timing.js";
import {
  conditionsAreEmpty,
  evaluateScheduleConditions,
} from "../src/lib/orchestration-conditions.js";
import { isOrchestrationPresetId } from "../src/lib/orchestration-presets.js";
import { isLegacyMetaSchedule } from "../src/lib/orchestration-plan.js";

test("normalizeIntervalSec enforces minimum 60 seconds", () => {
  assert.equal(normalizeIntervalSec(30), 60);
  assert.equal(normalizeIntervalSec(1800), 1800);
});

test("computeNextRunAt uses interval when cron is absent", () => {
  const from = new Date("2026-07-22T12:00:00.000Z");
  const next = computeNextRunAt({ from, intervalSec: 3600 });
  assert.equal(next.toISOString(), "2026-07-22T13:00:00.000Z");
});

test("computeNextRunAt finds next Saturday 9:00 for weekly discovery cron", () => {
  const from = new Date("2026-07-22T12:00:00.000Z"); // Wednesday
  const next = computeNextRunAt({ from, cronExpr: "0 9 * * 6" });
  assert.equal(next.getDay(), 6);
  assert.equal(next.getHours(), 9);
  assert.equal(next.getMinutes(), 0);
});

test("evaluateScheduleConditions respects pipeline and phase gates", () => {
  const base = {
    phase: "exploring" as const,
    pipelineCount: 0,
    buildingCount: 0,
    growingCount: 0,
    hasPendingIdea: false,
    pendingDecisions: 0,
    orgUnitsWithProducts: new Set<string>(),
  };

  assert.equal(
    evaluateScheduleConditions({ pipelineEmpty: true }, { ...base, pipelineCount: 2 }).met,
    false,
  );
  assert.equal(
    evaluateScheduleConditions({ phases: ["exploring"] }, base).met,
    true,
  );
  assert.equal(
    evaluateScheduleConditions({ noPendingDecisions: true }, { ...base, pendingDecisions: 1 }).met,
    false,
  );
  assert.equal(
    evaluateScheduleConditions(
      { orgUnitId: "dept-1" },
      { ...base, orgUnitsWithProducts: new Set(["dept-1"]) },
    ).met,
    true,
  );
  assert.equal(
    evaluateScheduleConditions(
      { orgUnitId: "dept-2" },
      { ...base, orgUnitsWithProducts: new Set(["dept-1"]) },
    ).met,
    false,
  );
});

test("conditionsAreEmpty detects empty condition objects", () => {
  assert.equal(conditionsAreEmpty(null), true);
  assert.equal(conditionsAreEmpty({}), true);
  assert.equal(conditionsAreEmpty({ pipelineEmpty: true }), false);
});

test("orchestration preset ids are validated", () => {
  assert.equal(isOrchestrationPresetId("on_demand"), true);
  assert.equal(isOrchestrationPresetId("discovery_only"), true);
  assert.equal(isOrchestrationPresetId("full_autonomous"), false);
  assert.equal(isOrchestrationPresetId("unknown"), false);
});

test("isLegacyMetaSchedule detects obsolete default meta rules", () => {
  assert.equal(
    isLegacyMetaSchedule({ name: "Autonomous company (meta)", orchestrationMode: "meta_dynamic" }),
    true,
  );
  assert.equal(
    isLegacyMetaSchedule({ name: "Orquestador dinámico", orchestrationMode: "meta_dynamic" }),
    true,
  );
  assert.equal(
    isLegacyMetaSchedule({ name: "Discovery semanal", orchestrationMode: "fixed" }),
    false,
  );
  assert.equal(
    isLegacyMetaSchedule({ name: "Custom meta rule", orchestrationMode: "meta_dynamic" }),
    false,
  );
});

test("meta_dynamic schedules are excluded from fixed-only orchestration policy", () => {
  const schedules = [
    { orchestrationMode: "meta_dynamic" as const },
    { orchestrationMode: "fixed" as const },
    { orchestrationMode: "meta_dynamic" as const },
  ];
  const remaining = schedules.filter((schedule) => schedule.orchestrationMode !== "meta_dynamic");
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0]?.orchestrationMode, "fixed");
});
