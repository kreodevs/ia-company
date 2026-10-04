/**
 * Organigrama — construcción de árbol (sin DATABASE_URL).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

type UnitRow = {
  id: string;
  name: string;
  type: string;
  slug: string;
  parentId: string | null;
};

type WorkCount = { orgUnitId: string; count: number };

interface OrganigramTestNode {
  id: string;
  name: string;
  type: string;
  slug: string;
  parentId: string | null;
  workItemCount: number;
  children: OrganigramTestNode[];
}

function buildOrganigramTree(units: UnitRow[], workItems: WorkCount[]): OrganigramTestNode[] {
  const countMap = new Map(workItems.map((w) => [w.orgUnitId, w.count]));
  const nodeMap = new Map<string, OrganigramTestNode>();

  for (const unit of units) {
    nodeMap.set(unit.id, {
      ...unit,
      workItemCount: countMap.get(unit.id) ?? 0,
      children: [],
    });
  }

  const roots: OrganigramTestNode[] = [];
  for (const node of nodeMap.values()) {
    const parent = node.parentId ? nodeMap.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

describe("organigram tree builder", () => {
  it("anida hijos y cuenta work items", () => {
    const roots = buildOrganigramTree(
      [
        { id: "u1", name: "Dept A", type: "department", slug: "a", parentId: null },
        { id: "u2", name: "Dept B", type: "department", slug: "b", parentId: "u1" },
      ],
      [{ orgUnitId: "u1", count: 2 }, { orgUnitId: "u2", count: 1 }],
    );

    assert.equal(roots.length, 1);
    assert.equal(roots[0].name, "Dept A");
    assert.equal(roots[0].workItemCount, 2);
    assert.equal(roots[0].children[0].name, "Dept B");
    assert.equal(roots[0].children[0].workItemCount, 1);
  });
});
