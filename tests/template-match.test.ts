import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findTenantTemplateMatch } from "../src/server/lib/template-match.js";

describe("findTenantTemplateMatch", () => {
  const tenantRows = [
    { id: "t1", name: "ceo-bezos", platformSourceId: "p1" },
    { id: "t2", name: "legacy-name", platformSourceId: null },
    { id: "t3", name: "custom-agent", platformSourceId: null },
  ];

  it("matches by platformSourceId even when platform name changed", () => {
    const match = findTenantTemplateMatch(tenantRows, "p1", "ceo-renamed");
    assert.equal(match?.id, "t1");
  });

  it("falls back to name when platformSourceId is unset", () => {
    const match = findTenantTemplateMatch(tenantRows, "p-new", "legacy-name");
    assert.equal(match?.id, "t2");
  });

  it("returns undefined when no match exists", () => {
    const match = findTenantTemplateMatch(tenantRows, "p-missing", "missing");
    assert.equal(match, undefined);
  });
});
