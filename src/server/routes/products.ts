import type { FastifyInstance } from "fastify";
import type { CompanyPhase, GoNoGoDecision, ProductPhase } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { enqueueIdeaEvaluation } from "../../lib/evaluate-idea.js";
import { backfillPipelineFromLastDiscovery } from "../../lib/convergence.js";
import { filterActionablePipelineIdeas } from "../../lib/pipeline-utils.js";
import {
  bootstrapProduct,
  ensureDefaultProducts,
  ensureTenantCycleState,
  listPipelineIdeas,
  listTenantProducts,
  listImportableWorkspaces,
  markIdeaGoNoGo,
  deletePipelineIdea,
  cancelTenantProduct,
  deleteTenantProduct,
  setFocusProduct,
  updateCompanyPhase,
} from "../../lib/product-registry.js";
import { WORKFLOW_NAMES } from "../../lib/workflow-names.js";
import {
  getProductLaunchOptions,
  launchProductWork,
  type LaunchProductWorkInput,
} from "../../lib/product-work-launcher.js";
import { getActiveOpencodeByProduct, getLatestCompletedDelegationForProduct, listProductOpencodeHistory } from "../../lib/opencode-history.js";
import { normalizeOpencodeDiff } from "../../lib/opencode-diff.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
import {
  buildStripeWebhookUrl,
  serializeTenantProductForClient,
} from "../../lib/product-serializer.js";

export async function productRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/products", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const products = await listTenantProducts(tenantId);
      return products.map(serializeTenantProductForClient);
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

  app.get("/products/overview", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      await ensureDefaultProducts(tenantId, tenant.slug);
      await backfillPipelineFromLastDiscovery(tenantId);

      const [products, ideas, cycle, lastDiscoveryRun] = await Promise.all([
        listTenantProducts(tenantId),
        listPipelineIdeas(tenantId),
        ensureTenantCycleState(tenantId),
        prisma.executionRun.findFirst({
          where: {
            tenantId,
            status: "COMPLETED",
            workflow: { name: WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true },
        }),
      ]);

      const focusProduct = products.find((product) => product.id === cycle.focusProductId) ?? null;
      const opencodeActiveByProductId = await getActiveOpencodeByProduct(tenantId);

      return {
        products,
        pipeline: filterActionablePipelineIdeas(ideas, products),
        focusProduct,
        opencodeActiveByProductId,
        lastDiscoveryRun: lastDiscoveryRun
          ? { id: lastDiscoveryRun.id, createdAt: lastDiscoveryRun.createdAt }
          : null,
      };
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
      githubRepoUrl?: string | null;
      stripeWebhookSecret?: string | null;
      orgUnitId?: string | null;
      workItemKind?: "product" | "client" | "campaign" | "project";
    };
  }>("/products/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Product not found" });

      const phaseChanged = request.body?.phase && request.body.phase !== existing.phase;
      const goNoGoChanged = request.body?.goNoGo && request.body.goNoGo !== existing.goNoGo;

      const { stripeWebhookSecret, orgUnitId, ...bodyRest } = request.body ?? {};
      const data: Record<string, unknown> = { ...bodyRest };

      if (orgUnitId !== undefined) {
        if (orgUnitId === null || orgUnitId === "") {
          data.orgUnitId = null;
        } else {
          const org = await prisma.orgUnit.findFirst({
            where: { id: orgUnitId, tenantId },
            select: { id: true },
          });
          if (!org) return reply.status(400).send({ error: "Org unit not found" });
          data.orgUnitId = orgUnitId;
        }
      }
      if (stripeWebhookSecret !== undefined) {
        const baseMeta =
          typeof existing.metadata === "object" && existing.metadata
            ? (existing.metadata as Record<string, unknown>)
            : {};
        if (stripeWebhookSecret === null || stripeWebhookSecret === "") {
          delete baseMeta.stripeWebhookSecret;
        } else {
          baseMeta.stripeWebhookSecret = stripeWebhookSecret;
        }
        data.metadata = baseMeta;
      }

      const product = await prisma.tenantProduct.update({
        where: { id: request.params.id },
        data: data as never,
      });

      if (request.body?.phase === "archived" || request.body?.phase === "paused") {
        const cycle = await prisma.tenantCycleState.findUnique({
          where: { tenantId },
        });
        if (cycle?.focusProductId === product.id) {
          await prisma.tenantCycleState.update({
            where: { tenantId },
            data: { focusProductId: null },
          });
        }
      }

      if (phaseChanged || goNoGoChanged) {
        const action =
          request.body?.phase === "archived"
            ? "product.archive"
            : request.body?.phase === "paused"
              ? "product.pause"
              : goNoGoChanged && request.body?.goNoGo === "no_go"
                ? "product.noGo"
                : "product.update";
        await logAudit(request, action, {
          productId: product.id,
          slug: product.slug,
          fromPhase: existing.phase,
          toPhase: product.phase,
          fromGoNoGo: existing.goNoGo,
          toGoNoGo: product.goNoGo,
        });
      } else {
        await logAudit(request, "product.update", { productId: product.id });
      }
      return serializeTenantProductForClient(product);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/products/:id/revenue-settings", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!product) return reply.status(404).send({ error: "Product not found" });

      const serialized = serializeTenantProductForClient(product);
      return {
        productId: product.id,
        revenueUsd: product.revenueUsd,
        stripeWebhookConfigured: serialized.stripeWebhookConfigured,
        revenueLastSyncedAt: serialized.revenueLastSyncedAt,
        revenueSource: serialized.revenueSource,
        webhookUrl: buildStripeWebhookUrl(product.id),
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string } }>("/products/:id/cancel", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Product not found" });

      const product = await cancelTenantProduct(tenantId, existing.id);
      await logAudit(request, "product.cancel", {
        productId: product.id,
        slug: product.slug,
        fromPhase: existing.phase,
      });
      return product;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.delete<{ Params: { id: string } }>("/products/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Product not found" });

      await deleteTenantProduct(tenantId, existing.id);
      await logAudit(request, "product.delete", {
        productId: existing.id,
        slug: existing.slug,
        phase: existing.phase,
      });
      return reply.status(204).send();
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

  app.delete<{ Params: { id: string } }>("/products/pipeline/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const idea = await prisma.pipelineIdea.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!idea) return reply.status(404).send({ error: "Pipeline idea not found" });

      await deletePipelineIdea(tenantId, idea.id);
      await logAudit(request, "pipeline.delete", { ideaId: idea.id, title: idea.title });
      return reply.status(204).send();
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/products/importable", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const workspaces = await listImportableWorkspaces(tenantId);
      return { workspaces };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Body: {
      slug: string;
      name: string;
      description?: string;
      phase?: ProductPhase;
      githubRepoUrl?: string;
      runIntake?: boolean;
      cloneRepo?: boolean;
    };
  }>("/products/register", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { name, slug, description, phase, githubRepoUrl, runIntake, cloneRepo } =
        request.body ?? {};
      if (!name?.trim() || !slug?.trim()) {
        return reply.status(400).send({ error: "name and slug are required" });
      }

      const { registerProductWithIntake } = await import("../../lib/product-intake.js");
      const result = await registerProductWithIntake({
        tenantId,
        name,
        slug,
        description,
        phase,
        githubRepoUrl,
        runIntake: runIntake !== false,
        cloneRepo,
      });

      await logAudit(request, "product.register", {
        productId: result.product.id,
        slug: result.product.slug,
        hasExistingCode: result.hasExistingCode,
        githubRepoUrl: result.product.githubRepoUrl,
        intakeRunId: result.intakeRunId,
        intakeStatus: result.intakeStatus,
      });
      return reply.status(201).send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string } }>("/products/:id/intake", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!product) return reply.status(404).send({ error: "Product not found" });

      const { startProductIntake, prepareGitHubForProduct } = await import(
        "../../lib/product-intake.js"
      );
      const { resolveProductWorkspaceRoot } = await import("../../lib/product-workspace.js");
      const { access, readdir } = await import("node:fs/promises");

      let githubContextText: string | undefined;
      if (product.githubRepoUrl) {
        let hasExistingCode = false;
        try {
          const root = resolveProductWorkspaceRoot(product.slug);
          await access(root);
          const entries = await readdir(root);
          hasExistingCode = entries.some((e) => e !== ".git");
        } catch {
          hasExistingCode = false;
        }
        const gh = await prepareGitHubForProduct({
          tenantId,
          productSlug: product.slug,
          githubRepoUrl: product.githubRepoUrl,
          hasExistingCode,
        });
        githubContextText = gh.contextText;
      }

      const intake = await startProductIntake(tenantId, product.id, {
        githubContextText,
        userDescription: product.description ?? undefined,
      });

      await logAudit(request, "product.intake", {
        productId: product.id,
        runId: intake.runId,
      });

      return reply.status(202).send(intake);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/products/:id/opencode/settings", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { getProductOpencodeSettings } = await import("../../lib/product-opencode.js");
      const settings = await getProductOpencodeSettings(tenantId, request.params.id);
      if (!settings) return reply.status(404).send({ error: "Product not found" });
      return settings;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Params: { id: string };
    Body: {
      defaultAgent?: string | null;
      defaultModel?: string | null;
      projectPath?: string | null;
    };
  }>("/products/:id/opencode/settings", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { updateProductOpencodeSettings } = await import("../../lib/product-opencode.js");
      const settings = await updateProductOpencodeSettings(
        tenantId,
        request.params.id,
        request.body ?? {},
      );
      if (!settings) return reply.status(404).send({ error: "Product not found" });
      await logAudit(request, "product.opencode_settings.update", {
        productId: request.params.id,
      });
      return settings;
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

  app.post<{ Params: { id: string } }>("/products/:id/consensus/clear", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!product) return reply.status(404).send({ error: "Product not found" });
      const { clearProductConsensus, getProductConsensus } = await import(
        "../../lib/product-consensus.js"
      );
      await clearProductConsensus(product.id, product.slug, product.name);
      await logAudit(request, "product.consensus.clear", { productId: product.id });
      return getProductConsensus(product.id);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/products/:id/last-run", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { getProductLastRunTrace } = await import("../../lib/product-last-run.js");
      const trace = await getProductLastRunTrace(tenantId, request.params.id);
      if (!trace) return reply.status(404).send({ error: "Product not found" });
      return trace;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/products/:id/agent-docs", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!product) return reply.status(404).send({ error: "Product not found" });
      const { listProductAgentDocs } = await import("../../lib/product-code.js");
      return await listProductAgentDocs(product.slug);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

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

  app.get<{ Params: { id: string }; Querystring: { watchRunId?: string } }>(
    "/products/:id/team",
    async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!product) return reply.status(404).send({ error: "Product not found" });

      const [agents, ideas, lastLinkedRun, lastRunTrace, cycle] = await Promise.all([
        prisma.agent.findMany({
          where: { tenantId, isActive: true },
          orderBy: { name: "asc" },
        }),
        listPipelineIdeas(tenantId),
        product.lastRunId
          ? prisma.executionRun.findUnique({
              where: { id: product.lastRunId },
              include: {
                workflow: { select: { name: true } },
                logs: {
                  where: { agentId: { not: null } },
                  orderBy: { createdAt: "desc" },
                  take: 30,
                  select: {
                    id: true,
                    level: true,
                    message: true,
                    agentId: true,
                    stepId: true,
                    createdAt: true,
                  },
                },
              },
            })
          : Promise.resolve(null),
        import("../../lib/product-last-run.js").then(({ getProductLastRunTrace }) =>
          getProductLastRunTrace(tenantId, product.id),
        ),
        import("../../lib/product-registry.js").then(({ ensureTenantCycleState }) =>
          ensureTenantCycleState(tenantId),
        ),
      ]);

      const { runBelongsToProduct, extractRunTaskPreview } = await import(
        "../../lib/product-run-association.js"
      );
      const isFocusProduct = cycle.focusProductId === product.id;
      const activeStatuses = ["RUNNING", "PENDING", "DELEGATED", "AWAITING_USER"] as const;
      const runInclude = {
        workflow: { select: { name: true } },
        logs: {
          where: { agentId: { not: null } },
          orderBy: { createdAt: "desc" as const },
          take: 30,
          select: {
            id: true,
            level: true,
            message: true,
            agentId: true,
            stepId: true,
            createdAt: true,
          },
        },
      };

      const [activeRunsQuery, recentRunsQuery] = await Promise.all([
        prisma.executionRun.findMany({
          where: { tenantId, status: { in: [...activeStatuses] } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: runInclude,
        }),
        prisma.executionRun.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: runInclude,
        }),
      ]);

      const runsById = new Map(recentRunsQuery.map((run) => [run.id, run]));
      for (const run of activeRunsQuery) {
        if (!runsById.has(run.id)) runsById.set(run.id, run);
      }
      if (lastLinkedRun && !runsById.has(lastLinkedRun.id)) {
        runsById.set(lastLinkedRun.id, lastLinkedRun);
      }
      const runs = Array.from(runsById.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      const watchRunId = request.query.watchRunId?.trim() || null;
      const productMatcher = (run: (typeof runs)[number]) =>
        runBelongsToProduct(run, product, { isFocusProduct });

      const runsForProduct = runs.filter(productMatcher);
      const productActiveRuns = activeRunsQuery.filter(productMatcher);

      let activeRun =
        (watchRunId ? productActiveRuns.find((r) => r.id === watchRunId) : null) ??
        productActiveRuns[0] ??
        runsForProduct.find((r) => activeStatuses.includes(r.status as (typeof activeStatuses)[number])) ??
        null;

      if (watchRunId) {
        const watched =
          runs.find((r) => r.id === watchRunId) ??
          (await prisma.executionRun.findFirst({
            where: { id: watchRunId, tenantId },
            include: {
              workflow: { select: { name: true } },
              logs: {
                where: { agentId: { not: null } },
                orderBy: { createdAt: "desc" },
                take: 30,
                select: {
                  id: true,
                  level: true,
                  message: true,
                  agentId: true,
                  stepId: true,
                  createdAt: true,
                },
              },
            },
          }));
        if (
          watched &&
          activeStatuses.includes(watched.status as (typeof activeStatuses)[number])
        ) {
          activeRun = watched;
        }
      }

      const activeRuns = productActiveRuns.map((run) => {
        const agentIds = new Set<string>();
        for (const log of run.logs) {
          if (log.agentId) agentIds.add(log.agentId);
        }
        return {
          id: run.id,
          workflowName: run.workflow.name,
          status: run.status,
          startedAt: run.startedAt,
          agentIds: Array.from(agentIds),
          task: extractRunTaskPreview(run.sharedMemory),
        };
      });

      const activeDelegation = activeRun
        ? await prisma.opencodeDelegation.findUnique({
            where: { runId: activeRun.id },
            select: {
              id: true,
              opencodeSessionId: true,
              status: true,
              startedAt: true,
            },
          })
        : null;
      const recentRuns = runsForProduct.slice(0, 5).map((r) => ({
        id: r.id,
        status: r.status,
        workflowName: r.workflow.name,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        totalTokens: r.totalTokens,
        totalCostUsd: r.totalCostUsd,
        errorMessage: r.errorMessage,
      }));

      const lastWorkedAt = new Map<string, { at: Date; message: string }>();
      const runsForAgentActivity = activeRun ? [activeRun] : runsForProduct;
      for (const r of runsForAgentActivity) {
        for (const log of r.logs) {
          if (!log.agentId) continue;
          const existing = lastWorkedAt.get(log.agentId);
          if (!existing || log.createdAt > existing.at) {
            lastWorkedAt.set(log.agentId, { at: log.createdAt, message: log.message });
          }
        }
      }

      const activeAgentIds = new Set<string>();
      if (activeRun) {
        for (const log of activeRun.logs) {
          if (log.agentId) activeAgentIds.add(log.agentId);
        }
      }

      const team = agents.map((a) => {
        const isActive = activeAgentIds.has(a.id);
        const lastWork = lastWorkedAt.get(a.id);
        let status: "idle" | "thinking" | "queued" = "idle";
        if (activeRun && ["RUNNING", "DELEGATED"].includes(activeRun.status) && isActive) {
          status = "thinking";
        } else if (activeRun && activeRun.status === "PENDING") status = "queued";
        return {
          id: a.id,
          name: a.name,
          role: a.role,
          status,
          currentTask:
            status === "thinking" && lastWork
              ? lastWork.message.slice(0, 120)
              : null,
          lastWorkedAt: lastWork ? lastWork.at : null,
          lastMessage: lastWork ? lastWork.message.slice(0, 200) : null,
        };
      });

      return {
        product: {
          id: product.id,
          tenantId: product.tenantId,
          slug: product.slug,
          name: product.name,
          description: product.description,
          phase: product.phase,
          pipelineRank: product.pipelineRank,
          goNoGo: product.goNoGo,
          revenueUsd: product.revenueUsd,
          lastRunId: product.lastRunId,
          orgUnitId: product.orgUnitId,
          workItemKind: product.workItemKind,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        },
        orgUnit: product.orgUnitId
          ? await prisma.orgUnit.findFirst({
              where: { id: product.orgUnitId, tenantId },
              select: { id: true, name: true, slug: true, type: true },
            })
          : null,
        activeRun: activeRun
          ? {
              id: activeRun.id,
              workflowName: activeRun.workflow.name,
              status: activeRun.status,
              startedAt: activeRun.startedAt,
              agentIds: Array.from(activeAgentIds),
              task: extractRunTaskPreview(activeRun.sharedMemory),
              errorMessage: activeRun.errorMessage,
              opencode: activeDelegation
                ? {
                    delegationId: activeDelegation.id,
                    sessionId: activeDelegation.opencodeSessionId,
                    status: activeDelegation.status,
                  }
                : null,
            }
          : null,
        activeRuns,
        recentRuns,
        team,
        pipeline: ideas.slice(0, 6).map((i) => ({
          id: i.id,
          title: i.title,
          interestScore: i.interestScore,
        })),
        lastRunTrace,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/products/:id/launch-options", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const options = await getProductLaunchOptions(tenantId, request.params.id);
      if (!options) return reply.status(404).send({ error: "Product not found" });
      return options;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string }; Body: LaunchProductWorkInput }>(
    "/products/:id/launch",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const body = request.body ?? {};
        if (!body.presetId && !body.workflowId && !body.agentId) {
          return reply.status(400).send({
            error: "Provide presetId, workflowId, or agentId",
          });
        }

        const result = await launchProductWork(tenantId, request.params.id, body);
        await logAudit(request, "product.launch", {
          productId: request.params.id,
          ...result,
          presetId: body.presetId,
          agentId: body.agentId,
        });
        return reply.status(202).send({ ...result, status: "PENDING" });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Params: { id: string } }>("/products/:id/opencode/history", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const history = await listProductOpencodeHistory(tenantId, request.params.id);
      if (!history) return reply.status(404).send({ error: "Product not found" });
      return history;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/products/:id/opencode/latest", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const product = await prisma.tenantProduct.findFirst({
        where: { id: request.params.id, tenantId },
        select: { id: true, name: true, slug: true },
      });
      if (!product) return reply.status(404).send({ error: "Product not found" });

      const active = await prisma.opencodeDelegation.findFirst({
        where: { tenantId, productId: product.id, status: { in: ["PENDING", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
      });
      const latest = active ?? (await getLatestCompletedDelegationForProduct(tenantId, product.id));

      if (!latest) {
        return { product, delegation: null, diff: [], resultSummary: null };
      }

      return {
        product,
        delegation: {
          id: latest.id,
          runId: latest.runId,
          opencodeSessionId: latest.opencodeSessionId,
          status: latest.status,
          resultSummary: latest.resultSummary,
          completedAt: latest.completedAt,
        },
        diff: normalizeOpencodeDiff(latest.diffJson),
        resultSummary: latest.resultSummary,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
