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
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
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
  },
  workflows: {
    list: () => request<Workflow[]>("/workflows"),
    get: (id: string) => request<Workflow>(`/workflows/${id}`),
    update: (id: string, body: unknown) =>
      request<Workflow>(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    execute: (id: string, body?: { initialMemory?: Record<string, unknown> }) =>
      request<{ runId: string }>(`/workflows/${id}/execute`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
  },
  runs: {
    list: () => request<ExecutionRun[]>("/runs"),
    get: (id: string) => request<ExecutionRun>(`/runs/${id}`),
    streamLogs: (runId: string, onEvent: (data: unknown) => void) => {
      const source = new EventSource(`${API_BASE}/runs/${runId}/logs`, {
        withCredentials: true,
      });
      source.onmessage = (e) => onEvent(JSON.parse(e.data));
      return () => source.close();
    },
  },
};
