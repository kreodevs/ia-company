import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  manualStepsWithAutoStatus,
  PAPERCLIP_MANUAL_QA_STEPS,
} from "../src/lib/platform-qa-checklist.js";

describe("platform-qa-checklist", () => {
  it("define pasos manuales de prod", () => {
    assert.ok(PAPERCLIP_MANUAL_QA_STEPS.length >= 10);
    assert.ok(PAPERCLIP_MANUAL_QA_STEPS.some((s) => s.id === "j-search"));
  });

  it("mapea autoStatus desde checks", () => {
    const mapped = manualStepsWithAutoStatus(PAPERCLIP_MANUAL_QA_STEPS, [
      { id: "migrations_paperclip", status: "pass" },
      { id: "office_search_intents", status: "fail" },
    ]);
    const migrate = mapped.find((s) => s.id === "prod-migrate");
    const search = mapped.find((s) => s.id === "j-search");
    assert.equal(migrate?.autoStatus, "pass");
    assert.equal(search?.autoStatus, "fail");
  });
});
