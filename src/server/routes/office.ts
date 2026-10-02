import type { FastifyInstance } from "fastify";
import {
chatWithCoordinator,
} from "../../lib/coordinator-chat.js";
import { handleCoordinatorChatStream } from "../../lib/coordinator-chat-stream.js";
import { pipeWebResponseToFastify } from "../lib/sse-response.js";
import {
encargoHumanHref,
deleteOfficeEncargos,
getOfficeEncargoDetail,
listOfficeEncargos,
} from "../../lib/office-encargos.js";
import {
executeOfficeTask,
getOfficeDashboard,
planOfficeTask,
} from "../../lib/office-coordinator.js";
import { listOfficeArchive } from "../../lib/office-archive.js";
import {
createDepartmentProcedure,
linkWorkflowToVirtualDepartment,
listProceduresForVirtualDepartment,
listGroupedProcedures,
} from "../../lib/office-procedures.js";
import { getDepartmentTeam } from "../../lib/office-department-team.js";
import {
createTenantNotification,
listTenantNotifications,
markAllNotificationsRead,
markNotificationRead,
} from "../../lib/tenant-notifications.js";
import {
createEncargoDelivery,
listEncargoDeliveries,
previewDeliveryPayload,
revokeEncargoDelivery,
rotateEncargoDeliveryToken,
sendEncargoDeliveryEmail,
} from "../../lib/encargo-delivery.js";
import { getTenantDeliveryBranding } from "../../lib/tenant-delivery-branding.js";
import { listWorkspaceAgentDocs } from "../../lib/product-code.js";
import { listSessionWorkspaceTree } from "../../lib/workspace-session.js";
import { resumeOfficeSession } from "../../lib/office-session-launcher.js";
import { resolveRunCheckpoint } from "../../lib/run-checkpoints.js";
import {
getAgentSessionWithTurns,
listSessionsForRun,
} from "../../lib/session-store.js";
import { prisma } from "../../lib/prisma.js";
import { handleRouteError, requireImpersonatedTenant, requireSession, HttpError } from "../lib/request-context.js";

export async function officeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get<{
    Querystring: {
      limit?: string;
      phase?: string;
      departmentSlug?: string;
      orgUnitId?: string;
      productId?: string;
    };
  }>(
    "/office/encargos",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { limit, phase, departmentSlug, orgUnitId, productId } = request.query;
        const validPhases = ["queued", "in_progress", "delivered", "failed", "cancelled"] as const;
        const phaseFilter = validPhases.includes(phase as (typeof validPhases)[number])
          ? (phase as (typeof validPhases)[number])
          : undefined;
        return listOfficeEncargos(tenantId, {
          limit: limit ? Number(limit) : undefined,
          phase: phaseFilter,
          departmentSlug,
          orgUnitId,
          productId,
        });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { runId: string } }>("/office/encargos/:runId", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const detail = await getOfficeEncargoDetail(tenantId, request.params.runId);
      if (!detail) return reply.status(404).send({ error: "Encargo not found" });
      return detail;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { runId: string }; Body: { amountUsd?: number; note?: string } }>(
    "/office/encargos/:runId/revenue",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const amountUsd = Number(request.body?.amountUsd);
        if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
          return reply.status(400).send({ error: "amountUsd must be greater than zero" });
        }

        const detail = await getOfficeEncargoDetail(tenantId, request.params.runId);
        if (!detail) return reply.status(404).send({ error: "Encargo not found" });
        if (!detail.productId) {
          return reply.status(400).send({ error: "Encargo has no linked product for revenue" });
        }

        const { recordEncargoRevenue } = await import("../../lib/product-revenue.js");
        const result = await recordEncargoRevenue({
          tenantId,
          productId: detail.productId,
          runId: request.params.runId,
          amountUsd,
          note: request.body?.note,
        });
        return reply.status(201).send(result);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Body: { ids?: string[] } }>("/office/encargos/bulk-delete", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const ids = Array.isArray(request.body?.ids) ? request.body.ids : [];
      if (ids.length === 0) {
        return reply.status(400).send({ error: "ids required" });
      }
      return deleteOfficeEncargos(tenantId, ids);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { runId: string } }>("/office/encargos/:runId/deliveries", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return { items: await listEncargoDeliveries(tenantId, request.params.runId) };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Params: { runId: string };
    Body: {
      label?: string;
      expiresAt?: string | null;
      expiryPreset?: string;
      includeFinalReport?: boolean;
      documentIds?: string[];
      accessPin?: string | null;
    };
  }>("/office/encargos/:runId/deliveries", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const session = requireSession(request);
      const delivery = await createEncargoDelivery(tenantId, request.params.runId, {
        ...request.body,
        createdByUserId: session.sub,
      });
      return reply.status(201).send(delivery);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.delete<{ Params: { runId: string; deliveryId: string } }>(
    "/office/encargos/:runId/deliveries/:deliveryId",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const delivery = await revokeEncargoDelivery(
          tenantId,
          request.params.runId,
          request.params.deliveryId,
        );
        if (!delivery) return reply.status(404).send({ error: "Delivery link not found" });
        return delivery;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Params: { runId: string };
    Body: {
      label?: string;
      includeFinalReport?: boolean;
      documentIds?: string[];
    };
  }>("/office/encargos/:runId/deliveries/preview", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const detail = await getOfficeEncargoDetail(tenantId, request.params.runId);
      if (!detail) return reply.status(404).send({ error: "Encargo not found" });
      const branding = await getTenantDeliveryBranding(tenantId);
      return previewDeliveryPayload(detail, branding, request.body ?? {});
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Params: { runId: string; deliveryId: string };
    Body: { to: string; subject?: string; message?: string };
  }>("/office/encargos/:runId/deliveries/:deliveryId/send-email", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const to = request.body?.to?.trim();
      if (!to) return reply.status(400).send({ error: "to is required" });
      const delivery = await sendEncargoDeliveryEmail(
        tenantId,
        request.params.runId,
        request.params.deliveryId,
        { to, subject: request.body?.subject, message: request.body?.message },
      );
      if (!delivery) return reply.status(404).send({ error: "Delivery link not found or inactive" });
      return delivery;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { runId: string; deliveryId: string } }>(
    "/office/encargos/:runId/deliveries/:deliveryId/rotate",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const delivery = await rotateEncargoDeliveryToken(
          tenantId,
          request.params.runId,
          request.params.deliveryId,
        );
        if (!delivery) return reply.status(404).send({ error: "Delivery link not found or revoked" });
        return delivery;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get("/office/dashboard", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return getOfficeDashboard(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { slug: string }; Querystring: { watchRun?: string } }>(
    "/office/departments/:slug/team",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const team = await getDepartmentTeam(tenantId, {
          departmentSlug: request.params.slug,
          watchRunId: request.query.watchRun,
        });
        if (!team) return reply.status(404).send({ error: "Department not found" });
        return team;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { slug: string } }>(
    "/office/departments/:slug/procedures",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        return listProceduresForVirtualDepartment(tenantId, request.params.slug);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { slug: string } }>(
    "/office/departments/:slug/playbooks",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { listDefaultPlaybooksForDepartment } = await import("../../lib/department-playbooks.js");
        return { items: await listDefaultPlaybooksForDepartment(tenantId, request.params.slug) };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { slug: string }; Body: { name?: string; description?: string | null } }>(
    "/office/departments/:slug/procedures",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const name = request.body?.name?.trim();
        if (!name) return reply.status(400).send({ error: "name is required" });
        const procedure = await createDepartmentProcedure(
          tenantId,
          { departmentSlug: request.params.slug },
          { name, description: request.body?.description ?? null },
        );
        return reply.status(201).send(procedure);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { slug: string }; Body: { workflowId?: string } }>(
    "/office/departments/:slug/procedures/link",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const workflowId = request.body?.workflowId?.trim();
        if (!workflowId) return reply.status(400).send({ error: "workflowId is required" });
        const procedure = await linkWorkflowToVirtualDepartment(
          tenantId,
          request.params.slug,
          workflowId,
        );
        return reply.status(201).send(procedure);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get("/office/procedures", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return listGroupedProcedures(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{
    Querystring: {
      departmentSlug?: string;
      orgUnitId?: string;
      productId?: string;
      agentName?: string;
      source?: string;
      q?: string;
      limit?: string;
    };
  }>("/office/archive", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { departmentSlug, orgUnitId, productId, agentName, source, q, limit } =
        request.query;
      const validSources = ["encargo", "encargo_summary", "workspace", "artifact"] as const;
      return listOfficeArchive(tenantId, {
        departmentSlug,
        orgUnitId,
        productId,
        agentName,
        source: validSources.includes(source as (typeof validSources)[number])
          ? (source as (typeof validSources)[number])
          : undefined,
        q,
        limit: limit ? Number(limit) : undefined,
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Querystring: { unreadOnly?: string; limit?: string; since?: string } }>(
    "/office/notifications",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { unreadOnly, limit, since } = request.query;
        return listTenantNotifications(tenantId, {
          unreadOnly: unreadOnly === "true",
          limit: limit ? Number(limit) : undefined,
          since,
        });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { id: string } }>("/office/notifications/:id/read", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const item = await markNotificationRead(tenantId, request.params.id);
      if (!item) return reply.status(404).send({ error: "Notification not found" });
      return item;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post("/office/notifications/read-all", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const count = await markAllNotificationsRead(tenantId);
      return { count };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Body: {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
      productId?: string;
      orgUnitId?: string;
      serviceId?: string;
      requestPlan?: boolean;
      parentRunId?: string;
    };
  }>("/office/chat", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { messages, productId, orgUnitId, serviceId, requestPlan, parentRunId } =
        request.body ?? {};
      if (!messages?.length) {
        return reply.status(400).send({ error: "messages is required" });
      }
      return chatWithCoordinator(tenantId, {
        messages,
        productId,
        orgUnitId,
        serviceId,
        requestPlan,
        parentRunId,
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post("/office/chat/stream", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const webResponse = await handleCoordinatorChatStream(tenantId, request.body);
      await pipeWebResponseToFastify(reply, webResponse);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { request?: string; productId?: string; serviceId?: string; orgUnitId?: string } }>(
    "/office/tasks/plan",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { request: taskRequest, productId, serviceId, orgUnitId } = request.body ?? {};
        if (!taskRequest?.trim()) {
          return reply.status(400).send({ error: "request is required" });
        }
        return planOfficeTask(tenantId, taskRequest, { productId, serviceId, orgUnitId });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
  
  // ---------------------------------------------------------------------------
  // Session runtime — detalle, files, checkpoints, resume
  // ---------------------------------------------------------------------------
  
  app.get<{ Params: { runId: string } }>("/office/runs/:runId/sessions", async (request, reply) => {
  try {
  const tenantId = requireImpersonatedTenant(request);
  const run = await prisma.executionRun.findFirst({
  where: { id: request.params.runId, tenantId },
  select: { id: true },
  });
  if (!run) throw new HttpError(404, "Run not found");
  return { sessions: await listSessionsForRun(run.id) };
  } catch (err) {
  return handleRouteError(reply, err);
  }
  });
  
  app.get<{ Params: { sessionId: string } }>("/office/sessions/:sessionId", async (request, reply) => {
  try {
  const tenantId = requireImpersonatedTenant(request);
  const session = await prisma.agentSession.findFirst({
  where: { id: request.params.sessionId, tenantId },
  select: { id: true },
  });
  if (!session) throw new HttpError(404, "Session not found");
  const detail = await getAgentSessionWithTurns(session.id);
  if (!detail) throw new HttpError(404, "Session not found");
  return detail;
  } catch (err) {
  return handleRouteError(reply, err);
  }
  });
  
  app.get<{ Params: { sessionId: string }; Querystring: { path?: string } }>(
  "/office/sessions/:sessionId/files",
  async (request, reply) => {
  try {
  const tenantId = requireImpersonatedTenant(request);
  const session = await prisma.agentSession.findFirst({
  where: { id: request.params.sessionId, tenantId },
  include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!session) throw new HttpError(404, "Session not found");
  const subPath = request.query.path ?? "";
  return {
  workspacePath: session.workspacePath,
  snapshot: session.snapshots[0] ?? null,
  tree: await listSessionWorkspaceTree(session.workspacePath, subPath),
  agentDocs: await listWorkspaceAgentDocs(session.workspacePath),
  };
  } catch (err) {
  return handleRouteError(reply, err);
  }
  },
  );
  
  app.get<{ Params: { sessionId: string } }>("/office/sessions/:sessionId/checkpoints", async (request, reply) => {
  try {
  const tenantId = requireImpersonatedTenant(request);
  const session = await prisma.agentSession.findFirst({
  where: { id: request.params.sessionId, tenantId },
  select: { id: true, runId: true },
  });
  if (!session) throw new HttpError(404, "Session not found");
  const checkpoint = await prisma.runCheckpoint.findMany({
  where: {
  runId: session.runId,
  tenantId,
  status: "pending",
  OR: [{ sessionId: session.id }, { sessionId: null }],
  },
  orderBy: { createdAt: "asc" },
  });
  return { checkpoints: checkpoint };
  } catch (err) {
  return handleRouteError(reply, err);
  }
  });
  
  app.post<{
  Params: { sessionId: string; checkpointId: string };
  Body: { resolution?: Record<string, unknown>; status?: "resolved" | "expired" };
  }>("/office/sessions/:sessionId/checkpoints/:checkpointId/resolve", async (request, reply) => {
  try {
  const tenantId = requireImpersonatedTenant(request);
  const checkpoint = await prisma.runCheckpoint.findFirst({
  where: {
  id: request.params.checkpointId,
  tenantId,
  status: "pending",
  OR: [{ sessionId: request.params.sessionId }, { sessionId: null }],
  },
  select: { id: true },
  });
  if (!checkpoint) throw new HttpError(404, "Pending checkpoint not found");
  await resolveRunCheckpoint({
  id: checkpoint.id,
  resolution: request.body?.resolution ?? {},
  status: request.body?.status,
  });
  return { ok: true, checkpointId: checkpoint.id };
  } catch (err) {
  return handleRouteError(reply, err);
  }
  });
  
  app.post<{
  Params: { sessionId: string };
  Body: { humanInput?: string };
  }>("/office/sessions/:sessionId/resume", async (request, reply) => {
  try {
  const tenantId = requireImpersonatedTenant(request);
  const session = await prisma.agentSession.findFirst({
  where: { id: request.params.sessionId, tenantId },
  select: { id: true, status: true },
  });
  if (!session) throw new HttpError(404, "Session not found");
  const humanInput = request.body?.humanInput?.trim();
  if (!humanInput) throw new HttpError(400, "humanInput is required");
  if (session.status !== "AWAITING_INPUT" && session.status !== "AWAITING_APPROVAL") {
  throw new HttpError(409, "Session is not awaiting input or approval");
  }
  await resumeOfficeSession(session.id, humanInput);
  return { ok: true, sessionId: session.id };
  } catch (err) {
  return handleRouteError(reply, err);
  }
  });
  
  app.post<{
  Body: {
  request?: string;
  productId?: string;
  orgUnitId?: string;
  serviceId?: string;
  agentIds?: string[];
  workflowId?: string;
  presetId?: string;
  parentRunId?: string;
  };
  }>("/office/tasks/execute", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const {
        request: taskRequest,
        productId,
        orgUnitId,
        serviceId,
        agentIds,
        workflowId,
        presetId,
        parentRunId,
      } = request.body ?? {};
      if (!taskRequest?.trim()) {
        return reply.status(400).send({ error: "request is required" });
      }
      const result = await executeOfficeTask(tenantId, {
        request: taskRequest,
        productId,
        orgUnitId,
        serviceId,
        agentIds,
        workflowId,
        presetId,
        parentRunId,
      });

      await createTenantNotification({
        tenantId,
        type: "task_started",
        title: "Encargo en curso",
        body: `${result.workflowName} — el equipo está trabajando.`,
        href: encargoHumanHref(result.runId),
        runId: result.runId,
      });

      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
