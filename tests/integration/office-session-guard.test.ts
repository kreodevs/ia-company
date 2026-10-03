/**
 * Guard dedicado de launchOfficeSession (Fase 3): un tenant con un run activo
 * (PENDING/RUNNING/DELEGATED/AWAITING_USER) no puede lanzar otro encargo vía
 * el launcher directo. Requiere DATABASE_URL.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import { launchOfficeSession } from "../../src/lib/office-session-launcher.js";
import { RunGuardError } from "../../src/lib/run-guards.js";

const hasDb = Boolean(process.env.DATABASE_URL);

test("guard: launchOfficeSession bloquea cuando hay run activo", { skip: !hasDb }, async () => {
  const agent = await prisma.agent.create({
    data: {
      tenantId: null,
      name: `guard-agent-${Date.now()}`,
      role: "researcher",
      systemPrompt: "test",
      modelKind: "chat",
      temperature: 0.3,
      isActive: true,
    },
  });

  // Run activo del tenant (sin tenantId=null, usamos un tenant "test").
  const tenant = await prisma.tenant.create({
    data: { name: `guard-tenant-${Date.now()}`, slug: `guard-${Date.now()}` },
  });
  const activeRun = await prisma.executionRun.create({
    data: { tenantId: tenant.id, status: "RUNNING", engine: "session" },
  });

  try {
    const plan = {
      serviceId: "test",
      deliverableKey: "report",
      agents: [
        {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          maxTurns: 3,
          budgetTokens: 100,
          budgetUsd: 0.01,
        },
      ],
    } as unknown as Parameters<typeof launchOfficeSession>[0]["plan"];

    await assert.rejects(
      launchOfficeSession({
        tenantId: tenant.id,
        plan,
        request: "segundo encargo",
      }),
      (err: unknown) => {
        assert.ok(err instanceof RunGuardError);
        assert.equal((err as RunGuardError).code, "ACTIVE_RUN");
        return true;
      },
    );
  } finally {
    await prisma.executionRun.delete({ where: { id: activeRun.id } }).catch(() => undefined);
    await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    await prisma.agent.delete({ where: { id: agent.id } }).catch(() => undefined);
  }
});
