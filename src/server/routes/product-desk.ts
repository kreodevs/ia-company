import type { FastifyInstance } from "fastify";
import type { KanbanColumn } from "@prisma/client";
import {
  approveDeskItem,
  archiveDeskItem,
  getDeskPendingCounts,
  getProductDeskBoard,
  getProductRoadmap,
  updateDeskItemKanbanColumn,
} from "../../lib/product-desk.js";
import { syncTheForgeToDesk } from "../../lib/theforge-desk-adapter.js";
import {
  integrationsFormToPatch,
  integrationsToFormValues,
  mergeProductIntegrations,
  parseProductIntegrations,
} from "../../lib/product-integrations.js";
import { launchProductWorkFromDesk } from "../../lib/product-desk-dispatch.js";
import {
  launchProductPlaybook,
  listPlaybooksForProduct,
} from "../../lib/product-playbook-launcher.js";
import { syncRecommendationsToDesk } from "../../lib/product-desk-recommender.js";
import {
  getProductSignalSummary,
  listRecentProductSignals,
} from "../../lib/product-signals.js";
import { prisma } from "../../lib/prisma.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

const KANBAN_COLUMNS = new Set<KanbanColumn>(["backlog", "approved", "in_progress", "done"]);

export async function productDeskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get<{ Params: { productId: string } }>(
    "/products/:productId/desk",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { productId } = request.params;
        const board = await getProductDeskBoard(tenantId, productId);
        const counts = await getDeskPendingCounts(tenantId, productId);
        return { board, counts };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { productId: string; deskItemId: string } }>(
    "/products/:productId/desk/:deskItemId/approve",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const userId =
          request.session?.kind === "tenant" ? request.session.tenantUserId : undefined;
        const { productId, deskItemId } = request.params;
        const item = await approveDeskItem({
          tenantId,
          productId,
          deskItemId,
          userId,
        });

        let autoDispatched: { runId: string; agentName: string } | null = null;
        if (item.type === "spec" && item.sourceKind !== "recommendation") {
          const product = await prisma.tenantProduct.findFirst({
            where: { id: productId, tenantId },
            select: { metadata: true },
          });
          const integrations = parseProductIntegrations(product?.metadata);
          if (integrations.desk?.autoDispatchSpec) {
            const result = await launchProductWorkFromDesk({
              tenantId,
              productId,
              deskItemId,
            });
            autoDispatched = { runId: result.runId, agentName: result.agentName };
          }
        }

        return { item, autoDispatched };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { productId: string; deskItemId: string } }>(
    "/products/:productId/desk/:deskItemId/archive",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const item = await archiveDeskItem({
          tenantId,
          productId: request.params.productId,
          deskItemId: request.params.deskItemId,
        });
        return { item };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Params: { productId: string; deskItemId: string };
    Body: { agentId?: string };
  }>("/products/:productId/desk/:deskItemId/dispatch", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const result = await launchProductWorkFromDesk({
        tenantId,
        productId: request.params.productId,
        deskItemId: request.params.deskItemId,
        agentId: request.body?.agentId,
      });
      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { productId: string } }>(
    "/products/:productId/desk/refresh-recommendations",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const created = await syncRecommendationsToDesk({
          tenantId,
          productId: request.params.productId,
        });
        return { created };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { productId: string } }>(
    "/products/:productId/signals",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { productId } = request.params;
        const [signals, summary] = await Promise.all([
          listRecentProductSignals(tenantId, productId),
          getProductSignalSummary(tenantId, productId),
        ]);
        return { signals, summary };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { productId: string } }>(
    "/products/:productId/playbooks",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const playbooks = await listPlaybooksForProduct(tenantId, request.params.productId);
        return { playbooks };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { productId: string; playbookId: string } }>(
    "/products/:productId/playbooks/:playbookId/launch",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const result = await launchProductPlaybook({
          tenantId,
          productId: request.params.productId,
          playbookId: request.params.playbookId,
        });
        return result;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { productId: string } }>(
    "/products/:productId/roadmap",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const board = await getProductRoadmap(tenantId, request.params.productId);
        return { board };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.patch<{
    Params: { productId: string; deskItemId: string };
    Body: { column?: string };
  }>("/products/:productId/desk/:deskItemId/kanban", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const column = request.body?.column as KanbanColumn | undefined;
      if (!column || !KANBAN_COLUMNS.has(column)) {
        return reply.status(400).send({ error: "Invalid kanban column" });
      }
      const item = await updateDeskItemKanbanColumn({
        tenantId,
        productId: request.params.productId,
        deskItemId: request.params.deskItemId,
        column,
      });
      return { item };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { productId: string } }>(
    "/products/:productId/desk/sync-theforge",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const product = await prisma.tenantProduct.findFirst({
          where: { id: request.params.productId, tenantId },
          select: { id: true, name: true },
        });
        if (!product) {
          return reply.status(404).send({ error: "Product not found" });
        }
        const result = await syncTheForgeToDesk({
          tenantId,
          productId: product.id,
          productName: product.name,
        });
        return result;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { productId: string } }>(
    "/products/:productId/integrations",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const product = await prisma.tenantProduct.findFirst({
          where: { id: request.params.productId, tenantId },
          select: { metadata: true },
        });
        if (!product) {
          return reply.status(404).send({ error: "Product not found" });
        }
        const integrations = parseProductIntegrations(product.metadata);
        return { integrations, form: integrationsToFormValues(integrations) };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.patch<{
    Params: { productId: string };
    Body: Record<string, unknown>;
  }>("/products/:productId/integrations", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.productId, tenantId },
        select: { id: true, metadata: true },
      });
      if (!product) {
        return reply.status(404).send({ error: "Product not found" });
      }
      const patch = integrationsFormToPatch(request.body ?? {});
      const metadata = mergeProductIntegrations(product.metadata, patch);
      await prisma.tenantProduct.update({
        where: { id: product.id },
        data: { metadata },
      });
      const integrations = parseProductIntegrations(metadata);
      return { integrations, form: integrationsToFormValues(integrations) };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
