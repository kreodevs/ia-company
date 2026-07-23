import type { FastifyInstance } from "fastify";
import { chatWithCoordinator } from "../../lib/coordinator-chat.js";
import {
  executeOfficeTask,
  getOfficeDashboard,
  planOfficeTask,
} from "../../lib/office-coordinator.js";
import {
  createTenantNotification,
  listTenantNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../lib/tenant-notifications.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function officeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/office/dashboard", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return getOfficeDashboard(tenantId);
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
      serviceId?: string;
      requestPlan?: boolean;
    };
  }>("/office/chat", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { messages, productId, serviceId, requestPlan } = request.body ?? {};
      if (!messages?.length) {
        return reply.status(400).send({ error: "messages is required" });
      }
      return chatWithCoordinator(tenantId, {
        messages,
        productId,
        serviceId,
        requestPlan,
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { request?: string; productId?: string; serviceId?: string } }>(
    "/office/tasks/plan",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { request: taskRequest, productId, serviceId } = request.body ?? {};
        if (!taskRequest?.trim()) {
          return reply.status(400).send({ error: "request is required" });
        }
        return planOfficeTask(tenantId, taskRequest, { productId, serviceId });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Body: {
      request?: string;
      productId?: string;
      serviceId?: string;
      agentIds?: string[];
      workflowId?: string;
      presetId?: string;
    };
  }>("/office/tasks/execute", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { request: taskRequest, productId, serviceId, agentIds, workflowId, presetId } =
        request.body ?? {};
      if (!taskRequest?.trim()) {
        return reply.status(400).send({ error: "request is required" });
      }
      const result = await executeOfficeTask(tenantId, {
        request: taskRequest,
        productId,
        serviceId,
        agentIds,
        workflowId,
        presetId,
      });

      await createTenantNotification({
        tenantId,
        type: "task_started",
        title: "Tarea en curso",
        body: `${result.workflowName} — sigue el progreso en Ejecuciones.`,
        href: `/runs/${result.runId}`,
        runId: result.runId,
      });

      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
