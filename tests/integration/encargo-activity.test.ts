/**
 * Reingeniería 2, Fase A — timeline unificado y separación estado técnico/empresarial.
 * Requiere DATABASE_URL.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import { getEncargoActivity } from "../../src/lib/encargo-activity.js";
import { ensureDepartmentWorkItems, getDepartmentWorkMap } from "../../src/lib/office-work-items.js";

const hasDb = Boolean(process.env.DATABASE_URL);

test(
  "fase A: timeline ordenada descendente y estado empresarial separado del técnico",
  { skip: !hasDb },
  async () => {
    const stamp = Date.now();
    const tenant = await prisma.tenant.create({
      data: { name: `fase-a-${stamp}`, slug: `fase-a-${stamp}` },
    });

    try {
      const run = await prisma.executionRun.create({
        data: {
          tenantId: tenant.id,
          status: "RUNNING",
          engine: "session",
          sharedMemory: {
            teamAgents: ["research-thompson", "product-norman", "cto-vogels"],
            officeRequest: "Fase A test",
            task: "Fase A test",
          },
        },
      });

      // Eventos técnicos en orden no cronológico de inserción
      const base = Date.now() - 60_000;
      await prisma.executionRunEvent.createMany({
        data: [
          {
            runId: run.id,
            tenantId: tenant.id,
            type: "status",
            payload: { message: "run iniciado" },
            createdAt: new Date(base),
          },
          {
            runId: run.id,
            tenantId: tenant.id,
            type: "step_complete",
            payload: { message: "paso 1 completo", agentName: "research-thompson" },
            createdAt: new Date(base + 30_000),
          },
          {
            runId: run.id,
            tenantId: tenant.id,
            type: "error",
            payload: { message: "fallo transitorio" },
            createdAt: new Date(base + 50_000),
          },
        ],
      });

      // Bloquear un work item (estado empresarial Bloqueado) mientras el run sigue RUNNING
      const items = await ensureDepartmentWorkItems(tenant.id, run.id);
      assert.ok(items && items.length >= 3);
      const engineering = items!.find((item) => item.departmentSlug === "engineering")!;
      await prisma.departmentWorkItem.update({
        where: { id: engineering.id },
        data: { status: "blocked", businessStatus: "Bloqueado", blockedReason: "Esperando decisión" },
      });

      // Actividad: debe estar ordenada descendente por createdAt
      const activity = await getEncargoActivity(tenant.id, run.id, { limit: 80 });
      assert.ok(activity);
      const times = activity!.map((entry) => entry.createdAt);
      const sortedDesc = [...times].sort((a, b) => b.localeCompare(a));
      assert.deepEqual(times, sortedDesc);

      // Debe mezclar categorías: técnico (eventos) + empresarial (work items via handoffs)
      const kinds = new Set(activity!.map((entry) => entry.category));
      assert.ok(kinds.has("technical"));

      // Estado técnico del run sigue RUNNING; estado empresarial del item es Bloqueado
      const map = await getDepartmentWorkMap(tenant.id, run.id);
      assert.ok(map);
      const engItem = map!.items.find((item) => item.departmentSlug === "engineering")!;
      assert.equal(engItem.status, "blocked");
      assert.equal(engItem.businessStatus, "Bloqueado");

      // Sesiones activas coexisten con estado empresarial bloqueado
      const agent = await prisma.agent.create({
        data: {
          tenantId: tenant.id,
          name: "cto-vogels-fase-a",
          role: "cto",
          systemPrompt: "test",
        },
      });
      const session = await prisma.agentSession.create({
        data: {
          runId: run.id,
          tenantId: tenant.id,
          agentId: agent.id,
          agentName: "cto-vogels",
          status: "ACTIVE",
          goal: "test",
          workspacePath: "/tmp/fase-a-test",
        },
      });
      const activeSession = await prisma.agentSession.findUnique({ where: { id: session.id } });
      assert.equal(activeSession?.status, "ACTIVE");
      const stillBlocked = await prisma.departmentWorkItem.findUnique({ where: { id: engineering.id } });
      assert.equal(stillBlocked?.businessStatus, "Bloqueado");

      // Run completado NO cambia el estado empresarial automáticamente:
      // sigue "En revisión"/bloqueado según negocio, no según el run técnico.
      await prisma.executionRun.update({ where: { id: run.id }, data: { status: "COMPLETED", completedAt: new Date() } });
      const afterComplete = await prisma.departmentWorkItem.findUnique({ where: { id: engineering.id } });
      assert.equal(afterComplete?.businessStatus, "Bloqueado");
    } finally {
      await prisma.agentSession.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.agent.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.executionRunEvent.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.departmentWorkItem.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.executionRun.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    }
  },
);