import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { navItemIsActive } from "../frontend/src/lib/sidebar.ts";

describe("sidebar nav active state", () => {
  it("does not mark /settings active on /settings/procedures when end is true", () => {
    const settings = { to: "/settings", labelKey: "nav.settings", end: true };
    const procedures = { to: "/settings/procedures", labelKey: "nav.procedures" };

    assert.equal(navItemIsActive("/settings/procedures", settings), false);
    assert.equal(navItemIsActive("/settings/procedures", procedures), true);
    assert.equal(navItemIsActive("/settings", settings), true);
  });
});
