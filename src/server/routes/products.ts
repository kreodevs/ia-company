import type { FastifyInstance } from "fastify";
import type { CompanyPhase, GoNoGoDecision, ProductPhase } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { enqueueIdeaEvaluation } from "../../lib/evaluate-idea.js";
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

  app.post<{ Params: { id: string } }>("/products/pipeline/:id/evaluate", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const runId = await enqueueIdeaEvaluation(tenantId, request.params.id);
      await logAudit(request, "pipeline.evaluate", { ideaId: request.params.id, runId });
      return reply.status(202).send({ runId });
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

  app.get<{ Params: { id: string } }>("/products/:id/consensus", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!product) return reply.status(404).send({ error: "Product not found" });
      const { getProductConsensus, ensureProductConsensus } = await import(
        "../../lib/product-consensus.js"
      );
      const existing = await getProductConsensus(product.id);
      if (existing) return existing;
      return ensureProductConsensus(product.id);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: { content: string; nextAction?: string } }>(
    "/products/:id/consensus",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const product = await prisma.tenantProduct.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!product) return reply.status(404).send({ error: "Product not found" });
        const { updateProductConsensusContent } = await import(
          "../../lib/product-consensus.js"
        );
        await updateProductConsensusContent(
          product.id,
          product.slug,
          request.body.content,
          request.body.nextAction ?? null,
        );
        await logAudit(request, "product.consensus.update", { productId: product.id });
        const { getProductConsensus } = await import("../../lib/product-consensus.js");
        return getProductConsensus(product.id);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/products/:id/consensus/revisions",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const product = await prisma.tenantProduct.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!product) return reply.status(404).send({ error: "Product not found" });
        const limit = Math.min(200, Math.max(1, Number(request.query.limit ?? 50)));
        const { listProductConsensusRevisions } = await import(
          "../../lib/product-consensus.js"
        );
        return listProductConsensusRevisions(product.id, limit);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { id: string }; Querystring: { path?: string } }>(
    "/products/:id/tree",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const product = await prisma.tenantProduct.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!product) return reply.status(404).send({ error: "Product not found" });
        const { listProductTree } = await import("../../lib/product-code.js");
        const entries = await listProductTree(product.slug, request.query.path ?? "");
        return { path: request.query.path ?? "", entries };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { id: string }; Querystring: { path: string } }>(
    "/products/:id/file",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const product = await prisma.tenantProduct.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!product) return reply.status(404).send({ error: "Product not found" });
        const filePath = request.query.path;
        if (!filePath) return reply.status(400).send({ error: "path is required" });
        const { readProductFile } = await import("../../lib/product-code.js");
        return await readProductFile(product.slug, filePath);
      } catch (err) {
        if (err instanceof Error && /not found|escapes|not a file/i.test(err.message)) {
          return reply.status(404).send({ error: err.message });
        }
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Params: { id: string };
    Body: { repoName: string; visibility: "private" | "public"; description?: string };
  }>("/products/:id/repo/create", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!product) return reply.status(404).send({ error: "Product not found" });
      if (!["building", "launching", "growing"].includes(product.phase)) {
        return reply.status(409).send({
          error: `Cannot create repo for product in phase ${product.phase}`,
        });
      }
      const { getPlatformSettings } = await import("../../lib/platform-settings.js");
      const settings = await getPlatformSettings();
      const token = settings.githubApiKey;
      if (!token) {
        return reply.status(412).send({
          error: "GitHub token is not configured. Set it in Platform settings.",
        });
      }
      const repoName = String(request.body?.repoName ?? "").trim();
      if (!/^[A-Za-z0-9._-]+$/.test(repoName)) {
        return reply.status(400).send({ error: "Invalid repo name" });
      }
      const visibility = request.body?.visibility === "public" ? "public" : "private";
      const { createProductGitHubRepo } = await import("../../lib/product-code.js");
      const result = await createProductGitHubRepo({
        tenantId,
        productId: product.id,
        repoName,
        visibility,
        description: request.body?.description,
        githubToken: token,
      });
      await prisma.tenantProduct.update({
        where: { id: product.id },
        data: { phase: "launching" },
      });
      await logAudit(request, "product.repo.create", { productId: product.id, repoName, result });
      return reply.status(201).send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
