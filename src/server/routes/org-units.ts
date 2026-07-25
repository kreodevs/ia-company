import type { FastifyInstance } from "fastify";
import type { ArtifactStatus, ArtifactType } from "@prisma/client";
import { listArtifacts, createArtifact, updateArtifactStatus } from "../../lib/artifact.js";
import { listOrgUnits, getOrgUnit, createOrgUnit, updateOrgUnit } from "../../lib/org-unit.js";
import { launchOrgUnitWork, listOrgUnitProducts } from "../../lib/org-launcher.js";
import {
  applyOrgStudioProposal,
  listBusinessTemplates,
  proposeOrgUnit,
} from "../../lib/org-studio.js";
import type { OrgStudioProposal } from "../../lib/org-os-types.js";
import { logAudit } from "../../lib/audit.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function orgUnitRoutes(app: FastifyInstance) {
  app.get("/org-units", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return listOrgUnits(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/org-units/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const unit = await getOrgUnit(tenantId, request.params.id);
      if (!unit) return reply.status(404).send({ error: "Org unit not found" });
      return unit;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { name: string; slug?: string; description?: string; type?: string } }>(
    "/org-units",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const name = request.body?.name?.trim();
        if (!name) return reply.status(400).send({ error: "name is required" });
        const unit = await createOrgUnit(tenantId, {
          name,
          slug: request.body.slug,
          description: request.body.description,
          type: request.body.type as "custom" | undefined,
        });
        await logAudit(request, "org_unit.create", { orgUnitId: unit.id, slug: unit.slug });
        return reply.status(201).send(unit);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      config?: Record<string, unknown>;
      tokens?: Record<string, unknown>;
      designMd?: string;
      isActive?: boolean;
    };
  }>("/org-units/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const unit = await updateOrgUnit(tenantId, request.params.id, request.body ?? {});
      if (!unit) return reply.status(404).send({ error: "Org unit not found" });
      await logAudit(request, "org_unit.update", { orgUnitId: unit.id });
      return unit;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/org-units/:id/products", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const unit = await getOrgUnit(tenantId, request.params.id);
      if (!unit) return reply.status(404).send({ error: "Org unit not found" });
      return listOrgUnitProducts(tenantId, request.params.id);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Params: { id: string };
    Body: { task?: string; productId?: string; presetId?: string };
  }>("/org-units/:id/launch", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const task = request.body?.task?.trim();
      if (!task) return reply.status(400).send({ error: "task is required" });
      const result = await launchOrgUnitWork(tenantId, request.params.id, {
        task,
        productId: request.body?.productId,
        presetId: request.body?.presetId,
      });
      await logAudit(request, "org_unit.launch", {
        orgUnitId: request.params.id,
        runId: result.runId,
        productId: result.productId,
      });
      return reply.status(201).send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/org-units/:id/artifacts", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { id } = request.params as { id: string };
      const query = request.query as { type?: ArtifactType; productId?: string };
      return listArtifacts(tenantId, {
        orgUnitId: id,
        type: query.type,
        productId: query.productId,
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Params: { id: string };
    Body: {
      title: string;
      type?: ArtifactType;
      body?: Record<string, unknown>;
      previewText?: string;
      productId?: string;
      createdByAgent?: string;
    };
  }>("/org-units/:id/artifacts", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const title = request.body?.title?.trim();
      if (!title) return reply.status(400).send({ error: "title is required" });
      const artifact = await createArtifact(tenantId, {
        orgUnitId: request.params.id,
        title,
        type: request.body.type,
        body: request.body.body,
        previewText: request.body.previewText,
        productId: request.body.productId,
        createdByAgent: request.body.createdByAgent,
      });
      return reply.status(201).send(artifact);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.patch<{ Params: { artifactId: string }; Body: { status: ArtifactStatus } }>(
    "/artifacts/:artifactId/status",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const status = request.body?.status;
        if (!status) return reply.status(400).send({ error: "status is required" });
        const artifact = await updateArtifactStatus(tenantId, request.params.artifactId, status);
        if (!artifact) return reply.status(404).send({ error: "Artifact not found" });
        return artifact;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get("/org-studio/templates", async (_request, reply) => {
    try {
      return listBusinessTemplates();
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { templateSlug?: string; name?: string; description?: string } }>(
    "/org-studio/propose",
    async (request, reply) => {
      try {
        requireImpersonatedTenant(request);
        const proposal = await proposeOrgUnit(request.body ?? {});
        return proposal;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Body: { proposal: OrgStudioProposal; name?: string; slug?: string; config?: Record<string, unknown> } }>(
    "/org-studio/apply",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const proposal = request.body?.proposal;
        if (!proposal?.templateSlug) {
          return reply.status(400).send({ error: "proposal is required" });
        }
        const result = await applyOrgStudioProposal(tenantId, proposal, {
          name: request.body.name,
          slug: request.body.slug,
          config: request.body.config,
        });
        await logAudit(request, "org_studio.apply", {
          orgUnitId: result.orgUnit.id,
          templateSlug: proposal.templateSlug,
          agentsCreated: result.agentsCreated,
        });
        return reply.status(201).send(result);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
