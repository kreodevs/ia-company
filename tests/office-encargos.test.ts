import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encargoHumanHref } from "../src/lib/office-encargos.js";

describe("office-encargos", () => {
  it("encargoHumanHref points to human office route", () => {
    assert.equal(encargoHumanHref("run-123"), "/office/encargos/run-123");
  });
});
