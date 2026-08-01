import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { departmentWarRoomHref } from "../src/lib/office-department-team.js";

describe("office-department-team helpers", () => {
  it("builds department war room hrefs", () => {
    assert.equal(
      departmentWarRoomHref({ departmentSlug: "engineering", runId: "run-1" }),
      "/office/departments/engineering?watchRun=run-1",
    );
    assert.equal(
      departmentWarRoomHref({ orgUnitId: "org-1", runId: "run-2" }),
      "/org-units/org-1?watchRun=run-2",
    );
    assert.equal(departmentWarRoomHref({}), null);
  });
});
