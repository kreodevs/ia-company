import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DEPARTMENT_PLAYBOOK_SERVICE_IDS,
  serviceTemplateById,
} from "../src/lib/department-playbooks.js";
import { OFFICE_SERVICES } from "../src/lib/office-coordinator.js";

test("each virtual department has exactly 3 default playbooks", () => {
  for (const [slug, serviceIds] of Object.entries(DEFAULT_DEPARTMENT_PLAYBOOK_SERVICE_IDS)) {
    assert.equal(serviceIds.length, 3, `${slug} should have 3 playbooks`);
    for (const id of serviceIds) {
      assert.ok(serviceTemplateById(id), `${slug} references unknown service ${id}`);
    }
  }
});

test("default playbooks map to office services with deliverables", () => {
  const ids = Object.values(DEFAULT_DEPARTMENT_PLAYBOOK_SERVICE_IDS).flat();
  for (const id of ids) {
    const service = OFFICE_SERVICES.find((s) => s.id === id);
    assert.ok(service?.deliverableKey.startsWith("office.deliverables."));
  }
});
