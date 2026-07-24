import type { FastifyInstance } from "fastify";
import { logAudit } from "../../lib/audit.js";
import {
  createTenantMcpServer,
  deleteTenantMcpServer,
  getTenantMcpServer,
  listTenantMcpServers,
  syncTenantMcpServerTools,
  updateTenantMcpServer,
} from "../../lib/mcp-registry.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

function serializeServer(server: NonNullable<Awaited<ReturnType<typeof getTenantMcpServer>>>) {
  return {
    id: server.id,
    tenantId: server.tenantId,
    name: server.name,
    slug: server.slug,
    description: server.description,
    transport: server.transport,
    command: server.command,
    argsJson: server.argsJson,
    url: server.url,
    envConfigured: Boolean(server.envJson),
    enabled: server.enabled,
    readOnly: server.readOnly,
    maxCallsPerRun: server.maxCallsPerRun,
    lastSyncedAt: server.lastSyncedAt?.toISOString() ?? null,
    tools: server.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      enabled: tool.enabled,
    })),
    agentIds: server.grants.map((grant) => grant.agentId),
  };
}

export async function tenantMcpRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);
  app.addHook("preHandler", app.requireTenantAdmin);

  app.get("/tenant/mcp/servers", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const servers = await listTenantMcpServers(tenantId);
      return servers.map((server) => serializeServer(server));
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/tenant/mcp/servers/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const server = await getTenantMcpServer(tenantId, request.params.id);
      if (!server) return reply.status(404).send({ error: "MCP server not found" });
      return serializeServer(server);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Body: {
      name: string;
      slug?: string;
      description?: string | null;
      command: string;
      argsJson?: string[];
      env?: Record<string, string>;
      readOnly?: boolean;
      maxCallsPerRun?: number;
      enabled?: boolean;
      agentIds?: string[];
    };
  }>("/tenant/mcp/servers", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const server = await createTenantMcpServer(tenantId, request.body);
      await logAudit(request, "tenant.mcp_server.create", {
        serverId: server?.id,
        slug: server?.slug,
      });
      return serializeServer(server!);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string | null;
      command?: string;
      argsJson?: string[];
      env?: Record<string, string>;
      readOnly?: boolean;
      maxCallsPerRun?: number;
      enabled?: boolean;
      agentIds?: string[];
    };
  }>("/tenant/mcp/servers/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const server = await updateTenantMcpServer(tenantId, request.params.id, request.body);
      await logAudit(request, "tenant.mcp_server.update", { serverId: server?.id });
      return serializeServer(server!);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.delete<{ Params: { id: string } }>("/tenant/mcp/servers/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      await deleteTenantMcpServer(tenantId, request.params.id);
      await logAudit(request, "tenant.mcp_server.delete", { serverId: request.params.id });
      return { ok: true };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/tenant/mcp/servers/:id/sync",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const server = await syncTenantMcpServerTools(tenantId, request.params.id);
        await logAudit(request, "tenant.mcp_server.sync", { serverId: request.params.id });
        return serializeServer(server!);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
