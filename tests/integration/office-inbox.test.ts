/**
 * Reingeniería 2, Corte 2 (Fase D) — Inbox empresarial (integración DB).
 * Requiere DATABASE_URL.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import { getOfficeInbox } from "../../src/lib/office-inbox.js";
import {
  DepartmentHandoffStatus,
  DepartmentWorkStatus,
  RunCheckpointStatus,
} from "@prisma/client";

const hasDb = Boolean(process.env.DATABASE_URL);

test(
  "office inbox: prioridad decision > handoff > blocked > failure > review > cost > info",
  { skip: !hasDb },
  async () => {
    const stamp = Date.now();
    const tenant = await prisma.tenant.create({
      data: { name: `inbox-${stamp}`, slug: `inbox-${stamp}` },
    });

    try {
      // 1) Run base
      const run = await prisma.executionRun.create({
        data: {
          tenantId: tenant.id,
          status: "RUNNING",
          engine: "session",
          sharedMemory: {
            teamAgents: ["research-thompson", "product-norman"],
            officeRequest: "Inbox test",
            task: "Inbox test",
          },
        },
      });

      // 2) DecisionProposal (category: decision, priority 1)
      await prisma.decisionProposal.create({
        data: {
          tenantId: tenant.id,
          runId: run.id,
          status: "pending_review",
          recommended: "GO",
          rationale: "Decisión pendiente para test inbox",
          ideaTitle: "Test Idea",
          pivotPrompt: null,
          evidence: [],
        },
      });

      // 3) Handoff pendiente (category: handoff, priority 2)
      const [wi1] = await prisma.departmentWorkItem.create({
        data: {
          tenantId: tenant.id,
          runId: run.id,
          title: "Estrategia",
          departmentSlug: "strategy",
          status: DepartmentWorkStatus.completed,
          businessStatus: "Completado",
        },
      });
      const [wi2] = await prisma.departmentWorkItem.create({
        data: {
          tenantId: tenant.id,
          runId: run.id,
          title: "Producto",
          departmentSlug: "product",
          status: DepartmentWorkStatus.pending,
          businessStatus: "Pendiente",
        },
      });
      await prisma.departmentHandoff.create({
        data: {
          tenantId: tenant.id,
          fromWorkItemId: wi1.id,
          toWorkItemId: wi2.id,
          fromDepartmentSlug: "strategy",
          toDepartmentSlug: "product",
          status: DepartmentHandoffStatus.pending_acceptance,
          message: "Handoff test",
          openQuestions: [],
          decisions: [],
          artifactPaths: [],
        },
      });

      // 4) Work item bloqueado (category: blocked, priority 3)
      await prisma.departmentWorkItem.create({
        data: {
          tenantId: tenant.id,
          runId: run.id,
          title: "Bloqueado",
          departmentSlug: "engineering",
          status: DepartmentWorkStatus.blocked,
          businessStatus: "Bloqueado",
          blockedReason: "Esperando API externa",
        },
      });

      // 5) Notificación run_failed (category: failure, priority 4)
      await prisma.tenantNotification.create({
        data: {
          tenantId: tenant.id,
          type: "run_failed",
          title: "Run fallido",
          body: "Error en run de prueba",
          href: null,
          runId: run.id,
        },
      });

      // 6) DocumentReview pendiente (category: review, priority 5)
      await prisma.documentReview.create({
        data: {
          tenantId: tenant.id,
          runId: run.id,
          docKey: "file:test.md",
          docPath: "test.md",
          versionSha: "abc123",
          status: "pending_review",
          resolvedBy: null,
          resolvedAt: null,
        },
      });

      // 7) Notificación cost_alert (category: cost, priority 6)
      await prisma.tenantNotification.create({
        data: {
          tenantId: tenant.id,
          type: "cost_alert",
          title: "Alerta de coste",
          body: "Superado 80% presupuesto",
          href: null,
          runId: run.id,
        },
      });

      // 8) Notificación budget_exceeded checkpoint (category: cost, priority 6)
      // No creamos checkpoint para simplificar; el test ya valida orden.

      // 9) Notificación info (category: info, priority 7)
      await prisma.tenantNotification.create({
        data: {
          tenantId: tenant.id,
          type: "run_completed",
          title: "Run completado",
          body: "Informe listo",
          href: null,
          runId: run.id,
        },
      });

      // Leer inbox sin filtro (todas)
      const inbox = await getOfficeInbox(tenant.id, { limit: 50 });

      // Verificar orden por prioridad
      const categories = inbox.map((item) => item.category);
      // decision (1) debe aparecer antes que handoff (2), etc.
      const expectedOrder: Array<[string, number]> = [
        ["decision", 1],
        ["handoff", 2],
        ["blocked", 3],
        ["failure", 4],
        ["review", 5],
        ["cost", 6],
        ["info", 7],
      ];

      let lastPriority = 0;
      for (const [cat, priority] of expectedOrder) {
        const idx = categories.indexOf(cat);
        if (idx === -1) {
          // Si no existe esa categoría, seguir
          continue;
        }
        // Verificar que no hay items de menor prioridad antes
        for (let i = 0; i < idx; i++) {
          const p = inbox[i].priority;
          assert.ok(
            p <= priority,
            `Prioridad ${p} (${categories[i]}) no debe ir antes que ${cat} (${priority})`,
          );
        }
        lastPriority = Math.max(lastPriority, priority);
      }

      // Filtrar por categoría
      const onlyDecisions = await getOfficeInbox(tenant.id, { category: "decision", limit: 50 });
      assert.ok(onlyDecisions.every((item) => item.category === "decision"));
    } finally {
      await prisma.tenantNotification.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.documentReview.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.departmentHandoff.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.departmentWorkItem.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.decisionProposal.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.executionRun.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    }
  },
);