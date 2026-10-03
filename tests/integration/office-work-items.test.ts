/**
 * Reingeniería 2 (Corte 1) — trabajo interdepartamental con handoffs.
 * Endpoints: GET /office/runs/:runId/work, POST /office/runs/:runId/handoffs, PATCH /office/handoffs/:handoffId.
 * Requiere DATABASE_URL.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import {
  createDepartmentHandoff,
  ensureDepartmentWorkItems,
  getDepartmentWorkMap,
  updateDepartmentHandoff,
} from "../../src/lib/office-work-items.js";
import { DepartmentHandoffStatus } from "@prisma/client";

const hasDb = Boolean(process.env.DATABASE_URL);

test(
  "office-work-items: mapa por departamento derivado del encargo",
  { skip: !hasDb },
  async () => {
    const stamp = Date.now();
    const tenant = await prisma.tenant.create({
      data: { name: `work-items-${stamp}`, slug: `work-items-${stamp}` },
    });

    try {
      const run = await prisma.executionRun.create({
        data: {
          tenantId: tenant.id,
          status: "RUNNING",
          engine: "session",
          sharedMemory: {
            teamAgents: ["research-thompson", "product-norman", "cto-vogels"],
            officeRequest: "Feature de onboarding",
            task: "Lanzar feature de onboarding",
          },
        },
      });

      const items = await ensureDepartmentWorkItems(tenant.id, run.id);
      // research=estrategia, product=producto, cto=ingeniería (3 departamentos distintos)
      assert.equal(items?.length, 3);
      const bySlug = new Map((items ?? []).map((item) => [item.departmentSlug, item]));
      assert.ok(bySlug.get("strategy"));
      assert.ok(bySlug.get("product"));
      assert.ok(bySlug.get("engineering"));

      const map = await getDepartmentWorkMap(tenant.id, run.id);
      assert.equal(map?.runId, run.id);
      assert.equal(map?.items.length, 3);
      assert.equal(map?.handoffs.length, 0);

      const strategy = bySlug.get("strategy")!;
      const product = bySlug.get("product")!;
      const handoff = await createDepartmentHandoff({
        tenantId: tenant.id,
        runId: run.id,
        fromWorkItemId: strategy.id,
        toWorkItemId: product.id,
        message: "Investigación completada, listo para especificación",
        openQuestions: ["¿priorizar Slack o Teams?"],
        decisions: ["Segmento objetivo B2B"],
      });
      assert.ok(handoff);
      assert.equal(handoff?.status, "pending_acceptance");
      assert.equal(handoff?.fromDepartmentSlug, "strategy");
      assert.equal(handoff?.toDepartmentSlug, "product");
      assert.equal(handoff?.openQuestions.length, 1);

      const updated = await updateDepartmentHandoff({
        tenantId: tenant.id,
        handoffId: handoff!.id,
        status: DepartmentHandoffStatus.accepted,
        actor: "product-norman",
      });
      assert.equal(updated?.status, "accepted");
      assert.equal(updated?.acceptedBy, "product-norman");
      const reloaded = await prisma.departmentWorkItem.findUnique({ where: { id: product.id } });
      assert.equal(reloaded?.status, "active");

      const clarified = await updateDepartmentHandoff({
        tenantId: tenant.id,
        handoffId: handoff!.id,
        status: DepartmentHandoffStatus.needs_clarification,
        clarification: "Falta definir el segmento enterprise",
      });
      assert.equal(clarified?.status, "needs_clarification");
      assert.equal(clarified?.requestedClarification, "Falta definir el segmento enterprise");
    } finally {
      await prisma.departmentHandoff.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.departmentWorkItem.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.executionRun.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    }
  },
);
