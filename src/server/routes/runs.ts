import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { subscribeToRun } from "../../core/engine.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
import type { ExecutionEvent } from "../../types/index.js";

export async function runRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/runs", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { workflowId, status } = request.query as {
        workflowId?: string;
        status?: string;
      };

      return prisma.executionRun.findMany({
        where: {
          tenantId,
          workflowId,
          status: status as never,
        },
        include: {
          workflow: { select: { id: true, name: true } },
          _count: { select: { logs: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/runs/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const run = await prisma.executionRun.findFirst({
        where: { id: request.params.id, tenantId },
        include: {
          workflow: true,
          logs: { orderBy: { createdAt: "asc" }, take: 200 },
        },
      });
      if (!run) return reply.status(404).send({ error: "Run not found" });
      return run;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/runs/:id/logs", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const runId = request.params.id;
      const run = await prisma.executionRun.findFirst({
        where: { id: runId, tenantId },
      });
      if (!run) return reply.status(404).send({ error: "Run not found" });

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": process.env.CORS_ORIGIN ?? "http://localhost:5173",
        "Access-Control-Allow-Credentials": "true",
      });

      const send = (event: ExecutionEvent | { type: string; data: unknown; runId?: string; timestamp?: string }) => {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      const existingLogs = await prisma.executionLog.findMany({
        where: { runId },
        orderBy: { createdAt: "asc" },
      });

      for (const log of existingLogs) {
        send({
          type: "log",
          runId,
          timestamp: log.createdAt.toISOString(),
          data: log,
        });
      }

      send({
        type: "status",
        runId,
        timestamp: new Date().toISOString(),
        data: { status: run.status, replay: true },
      });

      if (run.status === "COMPLETED" || run.status === "FAILED" || run.status === "CANCELLED") {
        send({
          type: "done",
          runId,
          timestamp: new Date().toISOString(),
          data: { status: run.status },
        });
        reply.raw.end();
        return reply;
      }

      const unsubscribe = subscribeToRun(runId, (event) => {
        send(event);
        if (event.type === "done") {
          unsubscribe();
          reply.raw.end();
        }
      });

      request.raw.on("close", () => {
        unsubscribe();
      });

      return reply;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string } }>("/runs/:id/cancel", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const run = await prisma.executionRun.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!run) return reply.status(404).send({ error: "Run not found" });
      if (run.status === "COMPLETED" || run.status === "FAILED" || run.status === "CANCELLED") {
        return reply.status(400).send({ error: "Run already finished" });
      }

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
  });
}
