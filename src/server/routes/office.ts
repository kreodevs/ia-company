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
import { listSessionWorkspaceTree, readSessionWorkspaceFile } from "../../lib/workspace-session.js";
import { resumeOfficeSession } from "../../lib/office-session-launcher.js";
import { resolveRunCheckpoint } from "../../lib/run-checkpoints.js";
import {
  getAgentSessionWithTurns,
  listSessionsForRun,
} from "../../lib/session-store.js";
import {
  getSpecialistSessionsSummary,
  listScopedSessions,
} from "../../lib/office-dept-sessions.js";
import {
  createDepartmentHandoff,
  getDepartmentWorkMap,
  updateDepartmentHandoff,
} from "../../lib/office-work-items.js";
import { DepartmentHandoffStatus, DocumentReviewStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { getEncargoActivity } from "../../lib/encargo-activity.js";
import { getOfficeInbox, type OfficeInboxCategory } from "../../lib/office-inbox.js";
import {
  addDocumentComment,
  convertCommentToWorkItem,
  listDocumentReviews,
  resolveDocumentComment,
  upsertDocumentReview,
} from "../../lib/document-reviews.js";
import { handleRouteError, requireImpersonatedTenant, requireSession, HttpError } from "../lib/request-context.js";

export async function officeRoutes(app: FastifyInstance) {
  // New endpoints for Corte 3 (Organigrama y Dashboard)
  app.get('/office/organigram', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const result = await import('../../lib/organigram.js').then(m => m.getOrganigram(tenantId));
      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get('/office/dashboard', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return getOfficeDashboard(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  // Corte 4 – Objectives & Initiatives
  app.get('/office/objectives', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const result = await import('../../lib/objectives.js').then(m => m.getObjectives(tenantId));
      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  // CRUD for objectives
  app.post('/office/objectives', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { name, description, targetValue } = request.body as any;
      if (!name) return reply.status(400).send({ error: 'name required' });
      const result = await import('../../lib/objectives.js').then(m => m.createObjective(tenantId, { name, description, targetValue }));
      return reply.status(201).send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string } }>('/office/objectives/:id', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { id } = request.params;
      const data = request.body as any;
      const result = await import('../../lib/objectives.js').then(m => m.updateObjective(tenantId, id, data));
      return reply.send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.delete<{ Params: { id: string } }>('/office/objectives/:id', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { id } = request.params;
      const result = await import('../../lib/objectives.js').then(m => m.deleteObjective(tenantId, id));
      return reply.send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get('/office/initiatives', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const result = await import('../../lib/objectives.js').then(m => m.getInitiatives(tenantId));
      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  // CRUD for initiatives
  app.post('/office/initiatives', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { name, description, status, companyGoalId } = request.body as any;
      if (!name || !companyGoalId) return reply.status(400).send({ error: 'name and companyGoalId required' });
      const result = await import('../../lib/objectives.js').then(m => m.createInitiative(tenantId, { name, description, status, companyGoalId }));
      return reply.status(201).send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string } }>('/office/initiatives/:id', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { id } = request.params;
      const data = request.body as any;
      const result = await import('../../lib/objectives.js').then(m => m.updateInitiative(tenantId, id, data));
      return reply.send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.delete<{ Params: { id: string } }>('/office/initiatives/:id', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { id } = request.params;
      const result = await import('../../lib/objectives.js').then(m => m.deleteInitiative(tenantId, id));
      return reply.send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  // Corte 4 – Cost metrics
  app.get('/office/costs', async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const result = await import('../../lib/objectives.js').then(m => m.getCostMetrics(tenantId));
      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

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

  // Duplicate dashboard route removed – kept the earlier implementation using getDashboardMetrics.


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

  // ---------------------------------------------------------------------------
  // Fase 4 — sala de departamento (sesiones vivas) y ficha de especialista
  // ---------------------------------------------------------------------------

  app.get<{
    Querystring: { departmentSlug?: string; orgUnitId?: string; agentName?: string; limit?: string };
  }>("/office/dept/sessions", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { departmentSlug, orgUnitId, agentName, limit } = request.query;
      if (!departmentSlug && !orgUnitId) {
        throw new HttpError(400, "departmentSlug or orgUnitId is required");
      }
      const sessions = await listScopedSessions(tenantId, {
        departmentSlug,
        orgUnitId,
        agentName,
        limit: limit ? Number(limit) : undefined,
      });
      return { sessions };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { agentName: string } }>("/office/specialists/:agentName/summary", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const summary = await getSpecialistSessionsSummary(tenantId, request.params.agentName);
      if (!summary) throw new HttpError(404, "Specialist not found");
      return summary;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  // -------------------------------------------------------------------------
  // Reingenieria 2 Fase A-C: trabajo interdepartamental (work items + handoffs)
  // -------------------------------------------------------------------------

  app.get<{ Params: { runId: string } }>("/office/runs/:runId/work", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const map = await getDepartmentWorkMap(tenantId, request.params.runId);
      if (!map) throw new HttpError(404, "Run not found");
      return map;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Params: { runId: string };
    Body: {
      fromWorkItemId?: string;
      toWorkItemId?: string;
      message?: string;
      openQuestions?: string[];
      decisions?: string[];
      artifactPaths?: string[];
    };
  }>("/office/runs/:runId/handoffs", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { fromWorkItemId, toWorkItemId, message, openQuestions, decisions, artifactPaths } =
        request.body ?? {};
      if (!message?.trim()) throw new HttpError(400, "message is required");
      const handoff = await createDepartmentHandoff({
        tenantId,
        runId: request.params.runId,
        fromWorkItemId,
        toWorkItemId,
        message: message.trim(),
        openQuestions: Array.isArray(openQuestions)
          ? openQuestions.filter((q): q is string => typeof q === "string")
          : [],
        decisions: Array.isArray(decisions)
          ? decisions.filter((d): d is string => typeof d === "string")
          : [],
        artifactPaths: Array.isArray(artifactPaths)
          ? artifactPaths.filter((p): p is string => typeof p === "string")
          : [],
      });
      if (!handoff) throw new HttpError(404, "Work item not found");
      return { handoff };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.patch<{
    Params: { handoffId: string };
    Body: { status?: string; actor?: string; clarification?: string; rejectionReason?: string };
  }>("/office/handoffs/:handoffId", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { status, actor, clarification, rejectionReason } = request.body ?? {};
      const allowed: DepartmentHandoffStatus[] = [
        DepartmentHandoffStatus.accepted,
        DepartmentHandoffStatus.needs_clarification,
        DepartmentHandoffStatus.rejected,
        DepartmentHandoffStatus.completed,
      ];
      if (!status || !allowed.includes(status as DepartmentHandoffStatus)) {
        throw new HttpError(
          400,
          "status must be one of accepted, needs_clarification, rejected, completed",
        );
      }
      const handoff = await updateDepartmentHandoff({
        tenantId,
        handoffId: request.params.handoffId,
        status: status as DepartmentHandoffStatus,
        actor,
        clarification,
        rejectionReason,
      });
      if (!handoff) throw new HttpError(404, "Handoff not found");
      return { handoff };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  // -------------------------------------------------------------------------
  // Reingenieria 2 Fase A: timeline unificado (tecnico + gobernanza + empresa)
  // -------------------------------------------------------------------------

  app.get<{ Params: { runId: string }; Querystring: { limit?: string } }>(
    "/office/runs/:runId/activity",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const activity = await getEncargoActivity(tenantId, request.params.runId, {
          limit: request.query.limit ? Number(request.query.limit) : undefined,
        });
        if (!activity) throw new HttpError(404, "Run not found");
        return { items: activity };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  // -------------------------------------------------------------------------
  // Reingenieria 2 Fase D: inbox empresarial (read-model agregador)
  // -------------------------------------------------------------------------

  const INBOX_CATEGORIES = [
    "decision",
    "handoff",
    "blocked",
    "review",
    "cost",
    "failure",
    "info",
  ] as const;

  app.get<{ Querystring: { category?: string; limit?: string } }>(
    "/office/inbox",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const category = INBOX_CATEGORIES.includes(request.query.category as OfficeInboxCategory)
          ? (request.query.category as OfficeInboxCategory)
          : undefined;
        const items = await getOfficeInbox(tenantId, {
          category,
          limit: request.query.limit ? Number(request.query.limit) : undefined,
        });
        return { items, count: items.length };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  // -------------------------------------------------------------------------
  // Reingenieria 2 Fase G: revision de documentos con comentarios anclados
  // -------------------------------------------------------------------------

  app.get<{ Params: { runId: string }; Querystring: { docKey?: string } }>(
    "/office/runs/:runId/reviews",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const reviews = await listDocumentReviews(tenantId, request.params.runId, {
          docKey: request.query.docKey,
        });
        return { reviews };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Params: { runId: string };
    Body: { docKey?: string; docPath?: string; versionSha?: string; status?: string };
  }>("/office/runs/:runId/reviews", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const session = requireSession(request);
      const { docKey, docPath, versionSha, status } = request.body ?? {};
      if (!docKey?.trim()) throw new HttpError(400, "docKey is required");
      const review = await upsertDocumentReview({
        tenantId,
        runId: request.params.runId,
        docKey: docKey.trim(),
        docPath: docPath ?? null,
        versionSha: versionSha ?? null,
        status: (status ?? "pending_review") as DocumentReviewStatus,
        actor: session.sub ?? null,
      });
      if (!review) throw new HttpError(404, "Run not found");
      return reply.status(201).send({ review });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Params: { runId: string; reviewId: string };
    Body: { body?: string; anchor?: { kind?: string; heading?: string; line?: number; quote?: string } };
  }>("/office/runs/:runId/reviews/:reviewId/comments", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const session = requireSession(request);
      const { body, anchor } = request.body ?? {};
      if (!body?.trim()) throw new HttpError(400, "body is required");
      const review = await addDocumentComment({
        tenantId,
        reviewId: request.params.reviewId,
        body: body.trim(),
        anchor,
        authorUserId: session.sub ?? null,
      });
      if (!review) throw new HttpError(404, "Review not found");
      return reply.status(201).send({ review });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { runId: string; commentId: string } }>(
    "/office/runs/:runId/reviews/comments/:commentId/resolve",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const review = await resolveDocumentComment({ tenantId, commentId: request.params.commentId });
        if (!review) throw new HttpError(404, "Comment not found");
        return { review };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Params: { runId: string; commentId: string };
    Body: { title?: string; ownerAgentName?: string; departmentSlug?: string };
  }>("/office/runs/:runId/reviews/comments/:commentId/convert", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const result = await convertCommentToWorkItem({
        tenantId,
        commentId: request.params.commentId,
        title: request.body?.title,
        ownerAgentName: request.body?.ownerAgentName ?? null,
        departmentSlug: request.body?.departmentSlug ?? null,
      });
      if (!result) throw new HttpError(404, "Comment not found");
      return reply.status(201).send(result);
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
        if (subPath) {
          try {
            const file = await readSessionWorkspaceFile(session.workspacePath, subPath);
            return {
              workspacePath: session.workspacePath,
              snapshot: session.snapshots[0] ?? null,
              tree: [],
              agentDocs: { roles: [], total: 0 },
              file,
            };
          } catch (err) {
            // if not a readable file, fall back to tree listing
          }
        }
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
