import type { FastifyInstance } from "fastify";
import {
  executeOfficeTask,
  getOfficeDashboard,
  planOfficeTask,
} from "../../lib/office-coordinator.js";
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
      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
