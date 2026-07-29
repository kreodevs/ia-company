import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VIRTUAL_OFFICE_DEPARTMENTS,
  buildVirtualRoom,
  resolveVirtualDepartmentForAgent,
} from "../src/lib/office-departments.js";

describe("office-departments", () => {
  it("defines four virtual departments with unique slugs", () => {
    const slugs = VIRTUAL_OFFICE_DEPARTMENTS.map((d) => d.slug);
    assert.equal(slugs.length, 4);
    assert.equal(new Set(slugs).size, 4);
    assert.deepEqual(slugs.sort(), ["business", "engineering", "product", "strategy"]);
  });

  it("marks virtual room busy when an agent is working", () => {
    const def = VIRTUAL_OFFICE_DEPARTMENTS.find((d) => d.slug === "engineering")!;
    const room = buildVirtualRoom(
      def,
      [
        { name: "cto-vogels", status: "busy" },
        { name: "fullstack-dhh", status: "idle" },
      ],
      [],
    );
    assert.equal(room.status, "busy");
    assert.equal(room.busyAgentCount, 1);
    assert.equal(room.href, "/office/departments/engineering");
  });

  it("marks virtual room idle when no agents are busy", () => {
    const def = VIRTUAL_OFFICE_DEPARTMENTS.find((d) => d.slug === "strategy")!;
    const room = buildVirtualRoom(
      def,
      [
        { name: "research-thompson", status: "idle" },
        { name: "ceo-bezos", status: "idle" },
      ],
      [],
    );
    assert.equal(room.status, "idle");
  });

  it("maps agents to virtual departments", () => {
    assert.equal(resolveVirtualDepartmentForAgent("fullstack-dhh"), "engineering");
    assert.equal(resolveVirtualDepartmentForAgent("marketing-godin"), "business");
    assert.equal(resolveVirtualDepartmentForAgent(null), null);
  });
});
