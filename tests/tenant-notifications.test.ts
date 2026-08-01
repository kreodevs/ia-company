import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDepartmentReadyCopy,
  buildRunNotificationCopy,
} from "../src/lib/tenant-notifications.js";

const LOCALE_SPLIT = "\n---\n";

function es(value: string): string {
  return value.split(LOCALE_SPLIT)[0] ?? value;
}

function en(value: string): string {
  const parts = value.split(LOCALE_SPLIT);
  return parts[1] ?? parts[0] ?? value;
}

describe("tenant-notifications", () => {
  it("builds bilingual copy for completed runs", () => {
    const copy = buildRunNotificationCopy({
      status: "COMPLETED",
      workflowName: "feature-development",
      totalCostUsd: 1.23,
      totalTokens: 4500,
    });
    assert.match(es(copy.title), /completado/i);
    assert.match(en(copy.title), /completed/i);
    assert.match(es(copy.body), /\$1\.23/);
    assert.match(es(copy.body), /4,500/);
    assert.match(en(copy.body), /\$1\.23/);
  });

  it("builds bilingual copy for failed runs", () => {
    const copy = buildRunNotificationCopy({
      status: "FAILED",
      workflowName: "seo-review",
      totalCostUsd: 0,
      totalTokens: 0,
      errorMessage: "Usage limit reached",
    });
    assert.match(es(copy.title), /falló/i);
    assert.match(en(copy.title), /failed/i);
    assert.match(es(copy.body), /Usage limit/);
    assert.match(en(copy.body), /Usage limit/);
  });

  it("builds department-ready copy for success and failure", () => {
    const ready = buildDepartmentReadyCopy({
      departmentLabel: "Ingeniería",
      procedureLabel: "Feature Development",
    });
    assert.match(es(ready.title), /listo/i);
    assert.match(en(ready.title), /ready/i);

    const failed = buildDepartmentReadyCopy({
      departmentLabel: "Ingeniería",
      procedureLabel: "Feature Development",
      failed: true,
    });
    assert.match(es(failed.title), /pausa/i);
    assert.match(en(failed.title), /idle/i);
    assert.match(es(failed.body), /falló/i);
    assert.match(en(failed.body), /failed/i);
  });
});
