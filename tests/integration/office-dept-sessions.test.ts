/**
 * Fase 4 — Sala de departamento y ficha de especialista.
 * Endpoints: GET /office/dept/sessions, GET /office/specialists/:agentName/summary.
 * Requiere DATABASE_URL.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import { listScopedSessions, getSpecialistSessionsSummary } from "../../src/lib/office-dept-sessions.js";

const hasDb = Boolean(process.env.DATABASE_URL);

test("office-dept-sessions: lista sesiones por dept virtual", { skip: !hasDb }, async () => {
  const tenant = await prisma.tenant.create({
    data: { name: `dept-sess-${Date.now()}`, slug: `dept-sess-${Date.now()}` },
  });

  try {
    const agent = await prisma.agent.create({
      data: {
        tenantId: tenant.id,
        name: `agent-${Date.now()}`,
        role: "researcher",
        systemPrompt: "test",
        modelKind: "chat",
        temperature: 0.3,
        isActive: true,
      },
    });

    const run = await prisma.executionRun.create({
      data: {
        tenantId: tenant.id,
        status: "COMPLETED",
        engine: "session",
        sharedMemory: {
          teamAgents: [agent.name],
          officeRequest: "test encargo",
          task: "test task",
        },
      },
    });

    await prisma.agentSession.create({
      data: {
        runId: run.id,
        tenantId: tenant.id,
        agentId: agent.id,
        status: "COMPLETED",
        role: "researcher",
        goal: "test goal",
        workspacePath: "/tmp/test",
        spentTokens: 100,
        spentCostUsd: 0.001,
      },
    });

    const sessions = await listScopedSessions(tenant.id, {
      departmentSlug: "strategy",
    });

    assert.ok(Array.isArray(sessions));
    assert.ok(sessions.length >= 1);
    const s = sessions[0];
    assert.equal(s.agentName, agent.name);
    assert.equal(s.runId, run.id);
    assert.ok(s.spentTokens >= 0);
  } finally {
    await prisma.executionRun.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
    await prisma.agent.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
    await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
  }
});

test("office-dept-sessions: ficha de especialista con totales y tools", { skip: !hasDb }, async () => {
  const tenant = await prisma.tenant.create({
    data: { name: `spec-sess-${Date.now()}`, slug: `spec-sess-${Date.now()}` },
  });

  try {
    const agent = await prisma.agent.create({
      data: {
        tenantId: tenant.id,
        name: `specialist-${Date.now()}`,
        role: "critic",
        systemPrompt: "test",
        modelKind: "chat",
        temperature: 0.3,
        isActive: true,
      },
    });

    const run = await prisma.executionRun.create({
      data: {
        tenantId: tenant.id,
        status: "COMPLETED",
        engine: "session",
        sharedMemory: {
          teamAgents: [agent.name],
          officeRequest: "encargo crítico",
          task: "review",
        },
      },
    });

    const session = await prisma.agentSession.create({
      data: {
        runId: run.id,
        tenantId: tenant.id,
        agentId: agent.id,
        status: "COMPLETED",
        role: "critic",
        goal: "review",
        workspacePath: "/tmp/test",
        spentTokens: 500,
        spentCostUsd: 0.005,
      },
    });

    await prisma.sessionToolCall.create({
      data: {
        sessionId: session.id,
        turnId: "t1",
        toolName: "write_file",
        argsJson: { path: "doc.md" },
        resultJson: { ok: true },
        status: "success",
      },
    });

    const summary = await getSpecialistSessionsSummary(tenant.id, agent.name, { limit: 10 });

    assert.ok(summary !== null);
    assert.equal(summary?.agent?.name, agent.name);
    assert.equal(summary?.sessions.length, 1);
    assert.equal(summary?.totals.sessions, 1);
    assert.equal(summary?.totals.spentTokens, 500);
    assert.ok(summary?.totals.spentCostUsd > 0);
    assert.ok(summary?.tools.length >= 1);
    const writeTool = summary?.tools.find((t) => t.toolName === "write_file");
    assert.ok(writeTool);
    assert.equal(writeTool.count, 1);
  } finally {
    await prisma.executionRun.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
    await prisma.agent.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
    await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
  }
});