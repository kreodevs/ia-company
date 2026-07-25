import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import {
  cancelOpencodeDelegation,
  confirmOpencodeDelegation,
  getOpencodeDelegationForRun,
  getOpencodeRunContext,
  OPENCODE_CONFIRM_REASON,
  resolveOpencodeRunGate,
} from "../../lib/opencode-bridge.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function opencodeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get<{ Params: { id: string } }>("/runs/:id/opencode", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const run = await prisma.executionRun.findFirst({
        where: { id: request.params.id, tenantId },
        select: { id: true, status: true },
      });
      if (!run) return reply.status(404).send({ error: "Run not found" });

      const [delegation, gate, context] = await Promise.all([
        getOpencodeDelegationForRun(run.id, tenantId),
        prisma.opencodeRunGate.findUnique({ where: { runId: run.id } }),
        getOpencodeRunContext(run.id, tenantId),
      ]);

      return {
        run,
        delegation,
        gate: gate
          ? {
              reason: gate.reason,
              decision: gate.decision,
              pendingBriefPreview: context?.pendingBriefPreview ?? null,
            }
          : null,
        diff: delegation?.diff ?? [],
        confirmDefaults: context?.confirmDefaults ?? null,
        awaitingOpencodeConfirm:
          run.status === "AWAITING_USER" && gate?.reason === OPENCODE_CONFIRM_REASON,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Params: { id: string };
    Body: {
      decision: "proceed_local" | "proceed_opencode" | "cancel";
      agent?: string | null;
      model?: string | null;
      projectPath?: string | null;
    };
  }>("/runs/:id/opencode-gate", { preHandler: [app.requireTenantAdmin] }, async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const decision = request.body?.decision;

      if (decision === "proceed_opencode") {
        const result = await confirmOpencodeDelegation({
          tenantId,
          runId: request.params.id,
          overrides: {
            agent: request.body?.agent,
            model: request.body?.model,
            projectPath: request.body?.projectPath,
          },
        });
        if (!result.ok) return reply.status(400).send({ error: result.error });
        return { ok: true, decision };
      }

      if (decision !== "proceed_local" && decision !== "cancel") {
        return reply.status(400).send({
          error: "decision must be proceed_local, proceed_opencode, or cancel",
        });
      }

      const result = await resolveOpencodeRunGate({
        tenantId,
        runId: request.params.id,
        decision,
      });
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return { ok: true, decision };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/runs/:id/opencode/cancel",
    { preHandler: [app.requireTenantAdmin] },
    async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const run = await prisma.executionRun.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!run) return reply.status(404).send({ error: "Run not found" });

      await cancelOpencodeDelegation(run.id, tenantId);
      const { requestRunCancellation } = await import("../../worker/run-control.js");
      requestRunCancellation(run.id);
      await prisma.executionRun.update({
        where: { id: run.id },
        data: { status: "CANCELLED", completedAt: new Date() },
      });
      return { ok: true, status: "CANCELLED" };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  },
  );
}
