const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export type AuthKind = "superadmin" | "tenant";
export type TenantUserRole = "owner" | "admin" | "member";

export interface SuperAdmin {
  id: string;
  email: string;
  name: string;
}

export interface TenantUser {
  id: string;
  email: string;
  name: string;
  role?: TenantUserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  _count?: { agents: number; workflows: number; runs: number; users?: number };
}

export type AuthStatus =
  | { needsSetup: boolean; authenticated: false }
  | {
      needsSetup: boolean;
      authenticated: true;
      kind: "superadmin";
      superAdmin: SuperAdmin;
      impersonatedTenant?: TenantSummary | null;
    }
  | {
      needsSetup: boolean;
      authenticated: true;
      kind: "tenant";
      tenantUser: TenantUser;
      tenant: TenantSummary;
    };

export interface AdminDashboard {
  superAdmin: SuperAdmin;
  impersonatedTenantId: string | null;
  stats: {
    tenants: number;
    tenantAgents: number;
    tenantWorkflows: number;
    runs: number;
    platformTemplates: { agents: number; skills: number; workflows: number };
  };
  tenants: TenantSummary[];
  recentRuns: Array<{
    id: string;
    status: string;
    createdAt: string;
    workflow: { name: string };
    tenant: { name: string; slug: string } | null;
  }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasJsonBody = init?.body != null && init.body !== "";
  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const message =
      (err && typeof err === "object" && ("error" in err || "message" in err)
        ? String((err as { error?: string; message?: string }).error ?? (err as { message?: string }).message)
        : null) ?? res.statusText;
    throw new Error(message || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  provider: "tokenlab" | "openrouter" | "custom";
  model: string;
  temperature: number;
  isActive: boolean;
  skills: Array<{ skill: Skill }>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  promptContent: string;
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  stepOrder: number;
  label: string | null;
  positionX: number;
  positionY: number;
  inputConfig: Record<string, unknown>;
  outputConfig: Record<string, unknown>;
  agent: Agent;
}

export interface WorkflowEdge {
  id: string;
  sourceStepId: string;
  targetStepId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  edges: WorkflowEdge[];
}

export interface ExecutionRun {
  id: string;
  workflowId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  sharedMemory: Record<string, unknown>;
  totalTokens: number;
  totalCostUsd: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  workflow?: { id: string; name: string };
  logs?: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  level: string;
  message: string;
  createdAt: string;
  stepId?: string;
  agentId?: string;
  tokensUsed?: number;
  costUsd?: number;
}

export interface TenantConsensus {
  tenantId: string;
  content: string;
  nextAction: string | null;
  companyPhase?: string;
  updatedAt?: string;
}

export interface ProductConsensus {
  id: string;
  productId: string;
  tenantId: string;
  content: string;
  nextAction: string | null;
  cycleNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductConsensusRevision {
  id: string;
  productId: string;
  runId: string | null;
  stepId: string | null;
  agentName: string;
  stepOrder: number;
  content: string;
  nextAction: string | null;
  decisions: Array<{ by: string; what: string; why?: string }>;
  openQuestions: string[];
  veto: { by: string; reason: string } | null;
  createdAt: string;
}

export type CompanyPhase =
  | "exploring"
  | "validating"
  | "building"
  | "launching"
  | "growing";

export type ProductPhase =
  | "queued"
  | "evaluating"
  | "building"
  | "launching"
  | "growing"
  | "paused"
  | "archived";

export type GoNoGoDecision = "pending" | "go" | "no_go";

export interface TenantProduct {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  phase: ProductPhase;
  pipelineRank: number;
  goNoGo: GoNoGoDecision;
  revenueUsd: number;
  lastRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineIdea {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  rank: number;
  interestScore: number;
  goNoGo: GoNoGoDecision;
  createdAt: string;
}

export interface InterestCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
  keywords: string[];
}

export interface TenantInterests {
  categories: InterestCategory[];
  selected: string[];
}

export interface ProductFile {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
  binary: boolean;
}

export interface ProductTreeEntry {
  path: string;
  name: string;
  type: "file" | "dir";
  size: number;
  children?: ProductTreeEntry[];
}

export interface CreateRepoResult {
  repoUrl: string;
  fullName: string;
  commitSha: string;
  pushed: boolean;
  message: string;
}

export interface OpsPortfolio {
  companyPhase: CompanyPhase;
  cycleNumber: number;
  stuckCounter: number;
  nextAction: string | null;
  focusProduct: TenantProduct | null;
  interests: string[];
  stats: {
    products: number;
    building: number;
    growing: number;
    pipeline: number;
    totalRevenueUsd: number;
  };
  products: TenantProduct[];
  pipeline: PipelineIdea[];
  schedules: AutonomousSchedule[];
  recentRuns: Array<{
    id: string;
    status: string;
    createdAt: string;
    workflow: { id: string; name: string } | null;
  }>;
  lastDiscoveryRun: { id: string; createdAt: string } | null;
}

export interface OpsNextRun {
  workflowId: string;
  workflowName: string;
  productSlug: string | null;
  reason: string;
}

export interface TenantLlmConfig {
  tenantId: string;
  platformProvider: string;
  platformModel: string;
  platformConfigured: boolean;
  defaultModel: string | null;
  maxCostUsdPerRun: number | null;
}

export interface AutonomousSchedule {
  id: string;
  tenantId: string;
  workflowId: string | null;
  scheduleKind: "workflow" | "meta";
  name: string;
  intervalSec: number;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export interface TenantUsageLimits {
  tenantId: string;
  maxRunsPerMonth: number | null;
  maxCostUsdPerMonth: number | null;
  maxTokensPerMonth: number | null;
}

export interface TenantNotificationConfig {
  tenantId: string;
  webhookUrl: string | null;
  slackWebhookUrl: string | null;
  emailRecipients: string | null;
  notifyOnComplete: boolean;
  notifyOnFail: boolean;
}

export interface TenantMonthlyUsage {
  periodStart: string;
  runs: number;
  totalTokens: number;
  totalCostUsd: number;
  limits: TenantUsageLimits;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorEmail: string;
  tenantId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface LlmModelOption {
  id: string;
  name: string;
  inputPer1MTokens: number | null;
  outputPer1MTokens: number | null;
  currency: "USD";
}

export interface PlatformSettings {
  id: string;
  publicUrl: string;
  defaultProvider: "tokenlab" | "openrouter" | "custom";
  defaultModel: string;
  defaultTemperature: number;
  tokenlabApiKey: string | null;
  tokenlabBaseUrl: string;
  openrouterApiKey: string | null;
  openrouterBaseUrl: string;
  openrouterReferer: string;
  customApiKey: string | null;
  customBaseUrl: string;
  resendApiKey: string | null;
  githubApiKey: string | null;
  emailFrom: string;
  executeRateLimitMax: number;
  authRateLimitMax: number;
  shellTimeoutMs: number;
  schedulerTickMs: number;
  updatedAt?: string;
}

export const api = {
  auth: {
    status: () => request<AuthStatus>("/auth/status"),
    setup: (body: { email: string; name: string; password: string }) =>
      request("/auth/setup", { method: "POST", body: JSON.stringify(body) }),
    loginSuperAdmin: (body: { email: string; password: string }) =>
      request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    loginTenant: (body: { tenantSlug: string; email: string; password: string }) =>
      request("/auth/tenant/login", { method: "POST", body: JSON.stringify(body) }),
    logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
    forgotPassword: (body: { tenantSlug: string; email: string }) =>
      request<{ ok: boolean; message: string }>("/auth/tenant/forgot-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    resetPassword: (body: { token: string; password: string }) =>
      request<{ ok: boolean }>("/auth/tenant/reset-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    impersonate: (tenantId: string | null) =>
      request<{ impersonatedTenant: TenantSummary | null }>("/auth/impersonate", {
        method: "POST",
        body: JSON.stringify({ tenantId }),
      }),
  },
  admin: {
    dashboard: () => request<AdminDashboard>("/admin/dashboard"),
    tenants: () => request<TenantSummary[]>("/admin/tenants"),
    createTenant: (body: {
      name: string;
      slug?: string;
      cloneTemplates?: boolean;
      ownerEmail?: string;
      ownerName?: string;
      ownerPassword?: string;
    }) =>
      request<{ tenant: TenantSummary; cloned: Record<string, number>; owner?: TenantUser }>(
        "/admin/tenants",
        { method: "POST", body: JSON.stringify(body) },
      ),
    deleteTenant: (id: string) =>
      request<void>(`/admin/tenants/${id}`, { method: "DELETE" }),
    syncTenantTemplates: (id: string, body?: { mode?: "merge" | "update" }) =>
      request<{
        tenantId: string;
        mode: "merge" | "update";
        stats: {
          skills: { added: number; updated: number; linked: number };
          agents: { added: number; updated: number; linked: number };
          workflows: { added: number; updated: number; linked: number };
        };
      }>(`/admin/tenants/${id}/sync-templates`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    auditLogs: (params?: { tenantId?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.tenantId) qs.set("tenantId", params.tenantId);
      if (params?.limit) qs.set("limit", String(params.limit));
      const query = qs.toString();
      return request<AuditLogEntry[]>(`/admin/audit-logs${query ? `?${query}` : ""}`);
    },
    platformSettings: {
      get: () => request<PlatformSettings>("/admin/settings/platform"),
      update: (body: Partial<PlatformSettings>) =>
        request<PlatformSettings>("/admin/settings/platform", {
          method: "PUT",
          body: JSON.stringify(body),
        }),
      listModels: (provider: "openrouter" | "tokenlab", q?: string) => {
        const qs = new URLSearchParams({ provider });
        if (q?.trim()) qs.set("q", q.trim());
        return request<{ provider: typeof provider; models: LlmModelOption[] }>(
          `/admin/settings/platform/models?${qs.toString()}`,
        );
      },
    },
    templates: {
      summary: () =>
        request<{ agents: number; skills: number; workflows: number }>("/admin/templates/summary"),
      reseed: () =>
        request<{ skills: number; agents: number; workflows: number }>("/admin/templates/reseed", {
          method: "POST",
        }),
      syncTenants: (body: {
        mode?: "merge" | "update";
        all?: boolean;
        tenantIds?: string[];
      }) =>
        request<{
          mode: "merge" | "update";
          results: Array<{
            tenantId: string;
            tenantName: string;
            stats: {
              skills: { added: number; updated: number; linked: number };
              agents: { added: number; updated: number; linked: number };
              workflows: { added: number; updated: number; linked: number };
            };
          }>;
        }>("/admin/templates/sync-tenants", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      listAgents: () => request<Agent[]>("/admin/templates/agents"),
      createAgent: (body: {
        name: string;
        role: string;
        systemPrompt: string;
        provider?: Agent["provider"];
        model?: string;
        temperature?: number;
        skillIds?: string[];
      }) =>
        request<Agent>("/admin/templates/agents", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      updateAgent: (id: string, body: Partial<Agent> & { skillIds?: string[] }) =>
        request<Agent>(`/admin/templates/agents/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        }),
      listSkills: () => request<Skill[]>("/admin/templates/skills"),
      createSkill: (body: { name: string; description: string; promptContent: string }) =>
        request<Skill>("/admin/templates/skills", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      updateSkill: (id: string, body: Partial<Omit<Skill, "id">>) =>
        request<Skill>(`/admin/templates/skills/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        }),
      listWorkflows: () => request<Workflow[]>("/admin/templates/workflows"),
      getWorkflow: (id: string) => request<Workflow>(`/admin/templates/workflows/${id}`),
      createWorkflow: (body: { name: string; description?: string }) =>
        request<Workflow>("/admin/templates/workflows", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      updateWorkflow: (id: string, body: unknown) =>
        request<Workflow>(`/admin/templates/workflows/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        }),
      deleteWorkflow: (id: string) =>
        request<void>(`/admin/templates/workflows/${id}`, { method: "DELETE" }),
    },
  },
  tenantUsers: {
    list: () => request<TenantUser[]>("/tenant/users"),
    create: (body: {
      email: string;
      name: string;
      password: string;
      role?: TenantUserRole;
    }) => request<TenantUser>("/tenant/users", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: { role?: TenantUserRole; isActive?: boolean }) =>
      request<TenantUser>(`/tenant/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/tenant/users/${id}`, { method: "DELETE" }),
  },
  agents: {
    list: () => request<Agent[]>("/agents"),
    get: (id: string) => request<Agent>(`/agents/${id}`),
    create: (body: Partial<Agent> & { skillIds?: string[] }) =>
      request<Agent>("/agents", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Agent> & { skillIds?: string[] }) =>
      request<Agent>(`/agents/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/agents/${id}`, { method: "DELETE" }),
  },
  skills: {
    list: () => request<Skill[]>("/skills"),
    get: (id: string) => request<Skill>(`/skills/${id}`),
    create: (body: Omit<Skill, "id">) =>
      request<Skill>("/skills", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Omit<Skill, "id">>) =>
      request<Skill>(`/skills/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/skills/${id}`, { method: "DELETE" }),
  },
  workflows: {
    list: () => request<Workflow[]>("/workflows"),
    get: (id: string) => request<Workflow>(`/workflows/${id}`),
    create: (body: { name: string; description?: string }) =>
      request<Workflow>("/workflows", { method: "POST", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/workflows/${id}`, { method: "DELETE" }),
    update: (id: string, body: unknown) =>
      request<Workflow>(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    execute: (
      id: string,
      body?: {
        initialMemory?: Record<string, unknown>;
        mergeConsensus?: boolean;
        syncConsensus?: boolean;
      },
    ) =>
      request<{ runId: string }>(`/workflows/${id}/execute`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
  },
  runs: {
    list: () => request<ExecutionRun[]>("/runs"),
    get: (id: string) => request<ExecutionRun>(`/runs/${id}`),
    cancel: (id: string) =>
      request<{ ok: boolean; status: string }>(`/runs/${id}/cancel`, { method: "POST" }),
    streamLogs: (runId: string, onEvent: (data: unknown) => void) => {
      const source = new EventSource(`${API_BASE}/runs/${runId}/logs`, {
        withCredentials: true,
      });
      source.onmessage = (e) => onEvent(JSON.parse(e.data));
      return () => source.close();
    },
  },
  consensus: {
    get: () => request<TenantConsensus>("/consensus"),
    update: (body: { content: string; nextAction?: string }) =>
      request<TenantConsensus>("/consensus", { method: "PUT", body: JSON.stringify(body) }),
  },
  schedules: {
    list: () => request<AutonomousSchedule[]>("/schedules"),
    create: (body: {
      name: string;
      workflowId?: string;
      intervalSec?: number;
      enabled?: boolean;
      scheduleKind?: "workflow" | "meta";
    }) => request<AutonomousSchedule>("/schedules", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: { enabled?: boolean; intervalSec?: number; name?: string }) =>
      request<AutonomousSchedule>(`/schedules/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/schedules/${id}`, { method: "DELETE" }),
    runNow: (id: string) =>
      request<{ runId: string; status: string }>(`/schedules/${id}/run-now`, { method: "POST" }),
    ensureMeta: () =>
      request<AutonomousSchedule>("/schedules", {
        method: "POST",
        body: JSON.stringify({
          name: "Autonomous company (meta)",
          scheduleKind: "meta",
          intervalSec: 1800,
          enabled: true,
        }),
      }),
  },
  products: {
    list: () => request<TenantProduct[]>("/products"),
    pipeline: () => request<PipelineIdea[]>("/products/pipeline"),
    focus: (id: string) =>
      request<{ focusProductId: string | null }>(`/products/${id}/focus`, { method: "POST" }),
    pipelineDecision: (id: string, decision: GoNoGoDecision) =>
      request<PipelineIdea>(`/products/pipeline/${id}`, {
        method: "PUT",
        body: JSON.stringify({ decision }),
      }),
    evaluateIdea: (id: string) =>
      request<{ runId: string }>(`/products/pipeline/${id}/evaluate`, { method: "POST" }),
    bootstrap: (body: { name: string; slug?: string; description?: string }) =>
      request<TenantProduct>("/products/bootstrap", { method: "POST", body: JSON.stringify(body) }),
    consensus: {
      get: (id: string) => request<ProductConsensus>(`/products/${id}/consensus`),
      update: (id: string, body: { content: string; nextAction?: string }) =>
        request<ProductConsensus>(`/products/${id}/consensus`, {
          method: "PUT",
          body: JSON.stringify(body),
        }),
      revisions: (id: string, limit = 50) =>
        request<ProductConsensusRevision[]>(
          `/products/${id}/consensus/revisions?limit=${limit}`,
        ),
    },
    code: {
      tree: (id: string, path = "") =>
        request<{ path: string; entries: ProductTreeEntry[] }>(
          `/products/${id}/tree?path=${encodeURIComponent(path)}`,
        ),
      file: (id: string, path: string) =>
        request<ProductFile>(
          `/products/${id}/file?path=${encodeURIComponent(path)}`,
        ),
      createRepo: (
        id: string,
        body: { repoName: string; visibility: "private" | "public"; description?: string },
      ) =>
        request<CreateRepoResult>(`/products/${id}/repo/create`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
  },
  ops: {
    portfolio: () => request<OpsPortfolio>("/ops/portfolio"),
    nextRun: () => request<OpsNextRun>("/ops/next-run"),
  },
  tenantSettings: {
    getLlm: () => request<TenantLlmConfig>("/tenant/settings/llm"),
    updateLlm: (body: Pick<TenantLlmConfig, "defaultModel" | "maxCostUsdPerRun">) =>
      request<TenantLlmConfig>("/tenant/settings/llm", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    getNotifications: () => request<TenantNotificationConfig>("/tenant/settings/notifications"),
    updateNotifications: (body: Partial<TenantNotificationConfig>) =>
      request<TenantNotificationConfig>("/tenant/settings/notifications", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    getUsage: () => request<TenantMonthlyUsage>("/tenant/settings/usage"),
    getLimits: () => request<TenantUsageLimits>("/tenant/settings/limits"),
    updateLimits: (body: Partial<TenantUsageLimits>) =>
      request<TenantUsageLimits>("/tenant/settings/limits", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    getInterests: () => request<TenantInterests>("/tenant/interests"),
    updateInterests: (body: { categories: string[] }) =>
      request<{ selected: string[] }>("/tenant/interests", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  },
};
