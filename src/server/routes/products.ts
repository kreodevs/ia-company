import type { FastifyInstance } from "fastify";
import type { CompanyPhase, GoNoGoDecision, ProductPhase } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import {
  bootstrapProduct,
  ensureTenantCycleState,
  listPipelineIdeas,
  listTenantProducts,
  markIdeaGoNoGo,
  setFocusProduct,
  updateCompanyPhase,
  upsertTenantProduct,
} from "../../lib/product-registry.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function productRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/products", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return listTenantProducts(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/products/pipeline", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return listPipelineIdeas(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/products/cycle", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const [cycle, consensus] = await Promise.all([
        ensureTenantCycleState(tenantId),
        prisma.tenantConsensus.findUnique({ where: { tenantId } }),
      ]);
      return {
        ...cycle,
        companyPhase: consensus?.companyPhase ?? cycle.phase,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Body: { name: string; slug?: string; description?: string };
  }>("/products/bootstrap", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await bootstrapProduct({ tenantId, ...request.body });
      await logAudit(request, "product.bootstrap", { productId: product.id, slug: product.slug });
      return reply.status(201).send(product);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      phase?: ProductPhase;
      goNoGo?: GoNoGoDecision;
      revenueUsd?: number;
    };
  }>("/products/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Product not found" });

      const product = await prisma.tenantProduct.update({
        where: { id: request.params.id },
        data: request.body,
      });
      await logAudit(request, "product.update", { productId: product.id });
      return product;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string } }>("/products/:id/focus", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Product not found" });

      const cycle = await setFocusProduct(tenantId, existing.id);
      await logAudit(request, "product.focus", { productId: existing.id });
      return cycle;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Body: { phase: CompanyPhase } }>("/products/company-phase", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const cycle = await updateCompanyPhase(tenantId, request.body.phase);
      await logAudit(request, "company.phase", { phase: request.body.phase });
      return cycle;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: { decision: GoNoGoDecision } }>(
    "/products/pipeline/:id",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const idea = await prisma.pipelineIdea.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!idea) return reply.status(404).send({ error: "Pipeline idea not found" });

        const updated = await markIdeaGoNoGo(idea.id, request.body.decision);
        await logAudit(request, "pipeline.decision", { ideaId: idea.id, decision: request.body.decision });
        return updated;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Body: { slug: string; name: string; description?: string; phase?: ProductPhase };
  }>("/products/register", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await upsertTenantProduct({ tenantId, ...request.body });
      await logAudit(request, "product.register", { productId: product.id, slug: product.slug });
      return reply.status(201).send(product);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
