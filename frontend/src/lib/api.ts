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
  status: "PENDING" | "RUNNING" | "DELEGATED" | "AWAITING_USER" | "COMPLETED" | "FAILED" | "CANCELLED";
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
  updatedAt: string;
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

export type ProductIntakeStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type WorkItemKind = "product" | "client" | "campaign" | "project";

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
  orgUnitId?: string | null;
  workItemKind?: WorkItemKind;
  githubRepoUrl?: string | null;
  githubDefaultBranch?: string | null;
  intakeStatus?: ProductIntakeStatus | null;
  intakeRunId?: string | null;
  stripeWebhookConfigured?: boolean;
  revenueLastSyncedAt?: string | null;
  revenueSource?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRevenueSettings {
  productId: string;
  revenueUsd: number;
  stripeWebhookConfigured: boolean;
  revenueLastSyncedAt: string | null;
  revenueSource: string | null;
  webhookUrl: string;
}

export interface TenantIntegrationsConfig {
  tenantId: string;
  githubToken: string | null;
  githubUsername: string | null;
  githubConfigured: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  smtpEnabled: boolean;
  smtpAllowedRecipients: string | null;
  smtpMaxPerDay: number;
  smtpConfigured: boolean;
}

export interface TenantMcpTool {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export interface TenantMcpServer {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  transport: "stdio" | "sse";
  command: string | null;
  argsJson: string | null;
  url: string | null;
  envConfigured: boolean;
  enabled: boolean;
  readOnly: boolean;
  maxCallsPerRun: number;
  lastSyncedAt: string | null;
  tools: TenantMcpTool[];
  agentIds: string[];
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

export interface ProductAgentDocFile {
  path: string;
  name: string;
  role: string;
  size: number;
  modifiedAt: string;
}

export interface ProductAgentDocsIndex {
  roles: Array<{ role: string; docs: ProductAgentDocFile[] }>;
  total: number;
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

export type DecisionStatus = "pending_review" | "drilling" | "approved" | "rejected" | "cancelled";

export interface DecisionProposalEvidence {
  agent: string;
  summary: string;
  field?: string;
}

export interface DecisionProposal {
  id: string;
  tenantId: string;
  ideaId: string;
  runId: string | null;
  workflowName: string;
  recommended: GoNoGoDecision;
  rationale: string;
  evidence: DecisionProposalEvidence[];
  pivotPrompt: string | null;
  status: DecisionStatus;
  drilldownRunId: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  idea: PipelineIdea;
}

export type TeamAgentStatus = "idle" | "thinking" | "queued";

export interface TeamAgent {
  id: string;
  name: string;
  role: string;
  status: TeamAgentStatus;
  currentTask: string | null;
  lastWorkedAt: string | null;
  lastMessage: string | null;
}

export interface TeamActiveRun {
  id: string;
  workflowName: string;
  status: string;
  startedAt: string | null;
  agentIds: string[];
  errorMessage?: string | null;
  opencode?: {
    delegationId: string;
    sessionId: string;
    status: string;
  } | null;
}

export interface TeamRecentRun {
  id: string;
  status: string;
  workflowName: string;
  startedAt: string | null;
  completedAt: string | null;
  totalTokens: number;
  totalCostUsd: number;
  errorMessage: string | null;
}

export interface ProductLastRunStepTrace {
  agentName: string;
  stepOrder: number;
  outputChars: number;
  memoryKeyChars: number;
  hasStructuredHandoff: boolean;
  wroteDocs: boolean;
  savedDeliverablePath: string | null;
  deliverableStatus: "saved_to_disk" | "handoff_only" | "missing";
  outputPreview: string;
  output: string;
  tokensUsed: number | null;
}

export interface ProductLastRunTrace {
  run: {
    id: string;
    status: string;
    workflowName: string;
    totalTokens: number;
    totalCostUsd: number;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
  } | null;
  steps: ProductLastRunStepTrace[];
  revisionsRecorded: number;
  docsInWorkspace: number;
  diagnosis: string;
}

export interface ProductTeam {
  product: {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description: string | null;
    phase: string;
    pipelineRank: number;
    goNoGo: GoNoGoDecision;
    revenueUsd: number;
    lastRunId: string | null;
    orgUnitId?: string | null;
    workItemKind?: WorkItemKind;
    createdAt: string;
    updatedAt: string;
  };
  orgUnit: { id: string; name: string; slug: string; type: string } | null;
  activeRun: TeamActiveRun | null;
  recentRuns: TeamRecentRun[];
  team: TeamAgent[];
  pipeline: Array<{ id: string; title: string; interestScore: number }>;
  lastRunTrace: ProductLastRunTrace | null;
}

export interface OpencodeActiveInfo {
  delegationId: string;
  runId: string;
  sessionId: string;
  status: string;
  runStatus: string;
}

export interface ProductsOverview {
  products: TenantProduct[];
  pipeline: PipelineIdea[];
  focusProduct: TenantProduct | null;
  opencodeActiveByProductId: Record<string, OpencodeActiveInfo>;
  lastDiscoveryRun: { id: string; createdAt: string } | null;
}

export type ProductWorkPresetCategory = "marketing" | "launch" | "build" | "business" | "ops";

export interface ProductLaunchOptionPreset {
  id: string;
  workflowName: string;
  category: ProductWorkPresetCategory;
  agentCount: number;
  workflowId: string | null;
  available: boolean;
}

export interface ProductLaunchOptionAgent {
  id: string;
  name: string;
  role: string;
}

export interface ProductLaunchOptionWorkflow {
  id: string;
  name: string;
  description: string | null;
  stepCount: number;
}

export interface ProductLaunchOptions {
  presets: ProductLaunchOptionPreset[];
  workflows: ProductLaunchOptionWorkflow[];
  agents: ProductLaunchOptionAgent[];
}

export interface OpsPortfolio {
  companyPhase: CompanyPhase;
  cycleNumber: number;
  stuckCounter: number;
  nextAction: string | null;
  focusProduct: TenantProduct | null;
  interests: string[];
  pendingDecisions: number;
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
  canExecute: boolean;
  blockedCode: "ACTIVE_RUN" | "PENDING_DECISIONS" | null;
  blockedMessage: string | null;
}

export type OfficeMode = "on_demand" | "scheduled" | "autonomous";

export interface OfficeTaskAgent {
  id: string;
  name: string;
  role: string;
  reasonKey: string;
}

export interface OfficeMissingAgentRole {
  name: string;
  suggestedBrief: string;
}

export interface OfficeTaskPlan {
  planId: string;
  request: string;
  summary: string;
  coordinatorNoteKey: string;
  agents: OfficeTaskAgent[];
  missingAgentRoles?: OfficeMissingAgentRole[];
  workflowId: string | null;
  workflowName: string | null;
  presetId: string | null;
  productId: string | null;
  productName: string | null;
  deliverableKey: string;
  estimatedCostUsd: { min: number; max: number };
  estimatedMinutes: { min: number; max: number };
  mode: "workflow" | "team" | "single";
  serviceId: string | null;
}

export interface OfficeActivityItem {
  id: string;
  type: "run_active" | "run_completed" | "run_failed" | "decision_pending" | "schedule_upcoming";
  title: string;
  subtitle: string;
  timestamp: string;
  href: string | null;
  status?: string;
  costUsd?: number;
}

export interface OfficeRoiProduct {
  id: string;
  name: string;
  slug: string;
  phase: string;
  revenueUsd: number;
  investedUsd: number;
  roiPct: number | null;
  runsCount: number;
}

export interface OfficeServiceTemplate {
  id: string;
  category: string;
  emoji: string;
  labelKey: string;
  descKey: string;
  examplePromptKey: string;
  agentNames: string[];
  deliverableKey: string;
}

export type OfficeEncargoPhase = "queued" | "in_progress" | "delivered" | "failed" | "cancelled";

export interface OfficeEncargoSummary {
  id: string;
  title: string;
  request: string;
  workflowName: string;
  status: string;
  phase: OfficeEncargoPhase;
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
  teamAgents: string[];
  totalCostUsd: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  documentCount: number;
  hasFinalReport: boolean;
}

export interface OfficeEncargoDocument {
  id: string;
  kind: "revision" | "step" | "file";
  agentName: string;
  title: string;
  markdown: string;
  path?: string;
  stepOrder: number;
}

export interface OfficeEncargoDetail extends OfficeEncargoSummary {
  finalReport: string;
  finalReportKind: "summary" | "agent" | "none";
  documents: OfficeEncargoDocument[];
  debugHref: string;
  warRoomHref: string | null;
}

export interface OfficeDashboard {
  mode: OfficeMode;
  autonomyEnabled: boolean;
  usage: {
    periodStart: string;
    runs: number;
    totalTokens: number;
    totalCostUsd: number;
    limits: {
      maxRunsPerMonth: number | null;
      maxCostUsdPerMonth: number | null;
      maxTokensPerMonth: number | null;
    };
  };
  stats: {
    activeRuns: number;
    pendingDecisions: number;
    agentsTotal: number;
    productsActive: number;
    totalInvestedUsd: number;
    totalRevenueUsd: number;
  };
  activity: OfficeActivityItem[];
  roi: OfficeRoiProduct[];
  agents: Array<{ id: string; name: string; role: string; status: "idle" | "busy" }>;
  services: OfficeServiceTemplate[];
}

export interface TenantLlmConfig {
  tenantId: string;
  platformProvider: string;
  platformModel: string;
  platformConfigured: boolean;
  defaultModel: string | null;
  maxCostUsdPerRun: number | null;
}

export interface ScheduleConditions {
  pipelineEmpty?: boolean;
  pipelineHasIdeas?: boolean;
  phases?: string[];
  hasBuildingProduct?: boolean;
  hasGrowingProduct?: boolean;
  hasPendingIdea?: boolean;
  noPendingDecisions?: boolean;
  orgUnitId?: string;
}

export interface AutonomousSchedule {
  id: string;
  tenantId: string;
  workflowId: string | null;
  scheduleKind: "workflow" | "meta";
  orchestrationMode: "fixed" | "meta_dynamic";
  name: string;
  intervalSec: number;
  cronExpr: string | null;
  priority: number;
  conditions: ScheduleConditions | null;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export interface OrchestrationPresetSummary {
  id: string;
  labelKey: string;
  descriptionKey: string;
  ruleCount: number;
}

export interface OrchestrationPreviewEntry {
  scheduleId: string;
  scheduleName: string;
  orchestrationMode: "fixed" | "meta_dynamic";
  workflowName: string | null;
  runAt: string;
  conditionsMet: boolean;
  skippedReason?: string;
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
  notifyInApp?: boolean;
}

export type TenantNotificationType =
  | "run_completed"
  | "run_failed"
  | "decision_pending"
  | "task_started";

export interface TenantNotificationItem {
  id: string;
  type: TenantNotificationType;
  title: string;
  body: string;
  href: string | null;
  runId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CoordinatorChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CoordinatorChatResponse {
  reply: string;
  plan: OfficeTaskPlan | null;
  tokensUsed: number;
  costUsd: number;
}

export interface TenantOpencodeConfig {
  tenantId: string;
  platformEnabled: boolean;
  enabled: boolean;
  baseUrl: string | null;
  username: string | null;
  password: string | null;
  defaultAgent: string | null;
  defaultModel: string | null;
  defaultProjectPath: string | null;
  pollIntervalMs: number;
  maxWaitMs: number;
  autoApprovePermissions: boolean;
  configured: boolean;
}

export interface ProductOpencodeSettings {
  productId: string;
  defaultAgent: string | null;
  defaultModel: string | null;
  projectPath: string | null;
  suggestedProjectPath: string;
  tenantDefaults: {
    defaultAgent: string | null;
    defaultModel: string | null;
    projectPath: string | null;
  };
  effectiveDefaults: {
    defaultAgent: string | null;
    defaultModel: string | null;
    projectPath: string | null;
  };
}

export interface OpencodeDelegation {
  id: string;
  opencodeSessionId: string;
  status: string;
  promptSummary: string | null;
  resultSummary: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  diff?: OpencodeDiffEntry[];
}

export interface OpencodeDiffEntry {
  path: string;
  additions: number | null;
  deletions: number | null;
}

export interface OpencodeRunInfo {
  run: { id: string; status: string };
  delegation: OpencodeDelegation | null;
  gate: {
    reason: string;
    decision: string | null;
    pendingBriefPreview?: string | null;
  } | null;
  diff: OpencodeDiffEntry[];
  confirmDefaults: {
    agent: string | null;
    model: string | null;
    projectPath: string | null;
    suggestedProjectPath: string;
  } | null;
  awaitingOpencodeConfirm?: boolean;
}

export interface ProductOpencodeHistoryItem {
  id: string;
  runId: string;
  runStatus: string;
  workflowName: string;
  opencodeSessionId: string;
  status: string;
  promptSummary: string | null;
  resultSummary: string | null;
  errorMessage: string | null;
  diffCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ProductOpencodeHistory {
  product: { id: string; slug: string; name: string };
  delegations: ProductOpencodeHistoryItem[];
}

export interface ProductOpencodeLatest {
  product: { id: string; name: string; slug: string };
  delegation: {
    id: string;
    runId: string;
    opencodeSessionId: string;
    status: string;
    resultSummary: string | null;
    completedAt: string | null;
  } | null;
  diff: OpencodeDiffEntry[];
  resultSummary: string | null;
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
  opencodeEnabled: boolean;
  opencodeDefaultPollIntervalMs: number;
  opencodeDefaultMaxWaitMs: number;
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
        productId?: string;
        productSlug?: string;
      },
    ) =>
      request<{ runId: string }>(`/workflows/${id}/execute`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
  },
  runs: {
    list: (query?: string) => request<ExecutionRun[]>(`/runs${query ?? ""}`),
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
    presets: () => request<OrchestrationPresetSummary[]>("/schedules/presets"),
    applyPreset: (presetId: string) =>
      request<AutonomousSchedule[]>("/schedules/apply-preset", {
        method: "POST",
        body: JSON.stringify({ presetId }),
      }),
    create: (body: {
      name: string;
      workflowId?: string;
      intervalSec?: number;
      cronExpr?: string | null;
      enabled?: boolean;
      scheduleKind?: "workflow" | "meta";
      orchestrationMode?: "fixed" | "meta_dynamic";
      priority?: number;
      conditions?: ScheduleConditions | null;
    }) => request<AutonomousSchedule>("/schedules", { method: "POST", body: JSON.stringify(body) }),
    update: (
      id: string,
      body: {
        enabled?: boolean;
        intervalSec?: number;
        cronExpr?: string | null;
        name?: string;
        priority?: number;
        conditions?: ScheduleConditions | null;
        workflowId?: string | null;
        orchestrationMode?: "fixed" | "meta_dynamic";
      },
    ) => request<AutonomousSchedule>(`/schedules/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/schedules/${id}`, { method: "DELETE" }),
    runNow: (id: string) =>
      request<{ runId: string; status: string }>(`/schedules/${id}/run-now`, { method: "POST" }),
  },
  products: {
    overview: () => request<ProductsOverview>("/products/overview"),
    list: () => request<TenantProduct[]>("/products"),
    pipeline: () => request<PipelineIdea[]>("/products/pipeline"),
    focus: (id: string) =>
      request<{ focusProductId: string | null }>(`/products/${id}/focus`, { method: "POST" }),
    update: (
      id: string,
      body: {
        name?: string;
        description?: string;
        phase?: ProductPhase;
        goNoGo?: GoNoGoDecision;
        revenueUsd?: number;
        githubRepoUrl?: string | null;
        stripeWebhookSecret?: string | null;
        orgUnitId?: string | null;
        workItemKind?: WorkItemKind;
      },
    ) =>
      request<TenantProduct>(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    revenueSettings: (id: string) =>
      request<ProductRevenueSettings>(`/products/${id}/revenue-settings`),
    pipelineDecision: (id: string, decision: GoNoGoDecision) =>
      request<PipelineIdea>(`/products/pipeline/${id}`, {
        method: "PUT",
        body: JSON.stringify({ decision }),
      }),
    deletePipelineIdea: (id: string) =>
      request<void>(`/products/pipeline/${id}`, { method: "DELETE" }),
    evaluateIdea: (id: string) =>
      request<{ runId: string }>(`/products/pipeline/${id}/evaluate`, { method: "POST" }),
    cancel: (id: string) =>
      request<TenantProduct>(`/products/${id}/cancel`, { method: "POST" }),
    delete: (id: string) => request<void>(`/products/${id}`, { method: "DELETE" }),
    importable: () =>
      request<{ workspaces: Array<{ slug: string; path: string; hasCode: boolean }> }>(
        "/products/importable",
      ),
    register: (body: {
      slug: string;
      name: string;
      description?: string;
      phase?: ProductPhase;
      githubRepoUrl?: string;
      runIntake?: boolean;
      cloneRepo?: boolean;
    }) =>
      request<{
        product: TenantProduct;
        hasExistingCode: boolean;
        workspacePath: string;
        intakeRunId: string | null;
        intakeStatus: ProductIntakeStatus;
      }>("/products/register", { method: "POST", body: JSON.stringify(body) }),
    startIntake: (id: string) =>
      request<{ runId: string; workflowName: string }>(`/products/${id}/intake`, {
        method: "POST",
      }),
    launchOptions: (id: string) => request<ProductLaunchOptions>(`/products/${id}/launch-options`),
    launch: (
      id: string,
      body: {
        presetId?: string;
        workflowId?: string;
        agentId?: string;
        task?: string;
        mergeConsensus?: boolean;
        setFocus?: boolean;
      },
    ) =>
      request<{ runId: string; workflowId: string; workflowName: string; status: string }>(
        `/products/${id}/launch`,
        { method: "POST", body: JSON.stringify(body) },
      ),
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
    agentDocs: (id: string) => request<ProductAgentDocsIndex>(`/products/${id}/agent-docs`),
    lastRun: (id: string) => request<ProductLastRunTrace>(`/products/${id}/last-run`),
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
    team: (id: string, watchRunId?: string) => {
      const qs = watchRunId ? `?watchRunId=${encodeURIComponent(watchRunId)}` : "";
      return request<ProductTeam>(`/products/${id}/team${qs}`);
    },
    opencodeHistory: (id: string) =>
      request<ProductOpencodeHistory>(`/products/${id}/opencode/history`),
    opencodeLatest: (id: string) =>
      request<ProductOpencodeLatest>(`/products/${id}/opencode/latest`),
    opencodeSettings: {
      get: (id: string) => request<ProductOpencodeSettings>(`/products/${id}/opencode/settings`),
      update: (
        id: string,
        body: {
          defaultAgent?: string | null;
          defaultModel?: string | null;
          projectPath?: string | null;
        },
      ) =>
        request<ProductOpencodeSettings>(`/products/${id}/opencode/settings`, {
          method: "PUT",
          body: JSON.stringify(body),
        }),
    },
  },
  office: {
    dashboard: () => request<OfficeDashboard>("/office/dashboard"),
    encargos: (params?: { limit?: number; phase?: OfficeEncargoPhase }) => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.phase) q.set("phase", params.phase);
      const qs = q.toString();
      return request<{ items: OfficeEncargoSummary[] }>(`/office/encargos${qs ? `?${qs}` : ""}`);
    },
    encargo: (runId: string) => request<OfficeEncargoDetail>(`/office/encargos/${runId}`),
    chat: (body: {
      messages: CoordinatorChatMessage[];
      productId?: string;
      orgUnitId?: string;
      serviceId?: string;
      requestPlan?: boolean;
    }) =>
      request<CoordinatorChatResponse>("/office/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    notifications: (params?: { unreadOnly?: boolean; limit?: number; since?: string }) => {
      const q = new URLSearchParams();
      if (params?.unreadOnly) q.set("unreadOnly", "true");
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.since) q.set("since", params.since);
      const qs = q.toString();
      return request<{ items: TenantNotificationItem[]; unreadCount: number }>(
        `/office/notifications${qs ? `?${qs}` : ""}`,
      );
    },
    markNotificationRead: (id: string) =>
      request<TenantNotificationItem>(`/office/notifications/${id}/read`, { method: "POST" }),
    markAllNotificationsRead: () =>
      request<{ count: number }>("/office/notifications/read-all", { method: "POST" }),
    planTask: (body: { request: string; productId?: string; orgUnitId?: string; serviceId?: string }) =>
      request<OfficeTaskPlan>("/office/tasks/plan", { method: "POST", body: JSON.stringify(body) }),
    executeTask: (body: {
      request: string;
      productId?: string;
      orgUnitId?: string;
      serviceId?: string;
      agentIds?: string[];
      workflowId?: string;
      presetId?: string;
    }) =>
      request<{ runId: string; workflowId: string; workflowName: string; productId: string | null }>(
        "/office/tasks/execute",
        { method: "POST", body: JSON.stringify(body) },
      ),
  },
  ops: {
    portfolio: () => request<OpsPortfolio>("/ops/portfolio"),
    nextRun: () => request<OpsNextRun>("/ops/next-run"),
    orchestrationPreview: (days = 7) =>
      request<{ days: number; preview: OrchestrationPreviewEntry[] }>(
        `/ops/orchestration-preview?days=${days}`,
      ),
  },
  decisions: {
    list: () => request<DecisionProposal[]>("/decisions"),
    get: (id: string) => request<DecisionProposal>(`/decisions/${id}`),
    approve: (id: string, body?: { actorEmail?: string }) =>
      request<DecisionProposal>(`/decisions/${id}/approve`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    reject: (id: string, body?: { actorEmail?: string }) =>
      request<DecisionProposal>(`/decisions/${id}/reject`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    pivot: (id: string, body: { pivot: string; actorEmail?: string }) =>
      request<DecisionProposal>(`/decisions/${id}/pivot`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    cancel: (id: string) =>
      request<DecisionProposal>(`/decisions/${id}/cancel`, { method: "POST" }),
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
    getOpencode: () => request<TenantOpencodeConfig>("/tenant/settings/opencode"),
    updateOpencode: (body: Partial<TenantOpencodeConfig> & { password?: string | null }) =>
      request<TenantOpencodeConfig>("/tenant/settings/opencode", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    testOpencode: (body?: {
      enabled?: boolean;
      baseUrl?: string | null;
      username?: string | null;
      password?: string | null;
    }) =>
      request<{ ok: boolean; version?: string; error?: string }>("/tenant/settings/opencode/test", {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    getIntegrations: () => request<TenantIntegrationsConfig>("/tenant/settings/integrations"),
    updateIntegrations: (body: Partial<TenantIntegrationsConfig> & {
      githubToken?: string | null;
      smtpPassword?: string | null;
    }) =>
      request<TenantIntegrationsConfig>("/tenant/settings/integrations", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    testGithub: () =>
      request<{ ok: boolean; login?: string; message: string }>(
        "/tenant/settings/integrations/github/test",
        { method: "POST" },
      ),
    testSmtp: () =>
      request<{ ok: boolean; message: string }>("/tenant/settings/integrations/smtp/test", {
        method: "POST",
      }),
  },
  tenantMcp: {
    listServers: () => request<TenantMcpServer[]>("/tenant/mcp/servers"),
    getServer: (id: string) => request<TenantMcpServer>(`/tenant/mcp/servers/${id}`),
    createServer: (body: {
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
    }) =>
      request<TenantMcpServer>("/tenant/mcp/servers", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateServer: (
      id: string,
      body: {
        name?: string;
        description?: string | null;
        command?: string;
        argsJson?: string[];
        env?: Record<string, string>;
        readOnly?: boolean;
        maxCallsPerRun?: number;
        enabled?: boolean;
        agentIds?: string[];
      },
    ) =>
      request<TenantMcpServer>(`/tenant/mcp/servers/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    deleteServer: (id: string) =>
      request<{ ok: boolean }>(`/tenant/mcp/servers/${id}`, { method: "DELETE" }),
    syncServer: (id: string) =>
      request<TenantMcpServer>(`/tenant/mcp/servers/${id}/sync`, { method: "POST" }),
  },
  opencode: {
    getRun: (runId: string) => request<OpencodeRunInfo>(`/runs/${runId}/opencode`),
    resolveGate: (
      runId: string,
      decision: "proceed_local" | "proceed_opencode" | "cancel",
      overrides?: { agent?: string | null; model?: string | null; projectPath?: string | null },
    ) =>
      request<{ ok: boolean; decision: string }>(`/runs/${runId}/opencode-gate`, {
        method: "POST",
        body: JSON.stringify({ decision, ...overrides }),
      }),
    cancelDelegation: (runId: string) =>
      request<{ ok: boolean; status: string }>(`/runs/${runId}/opencode/cancel`, { method: "POST" }),
  },
  orgUnits: {
    list: () => request<import("./org-types").OrgUnit[]>("/org-units"),
    get: (id: string) => request<import("./org-types").OrgUnit>(`/org-units/${id}`),
    update: (id: string, body: { config?: Record<string, unknown>; designMd?: string }) =>
      request<import("./org-types").OrgUnit>(`/org-units/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    products: (id: string) => request<TenantProduct[]>(`/org-units/${id}/products`),
    createWorkItem: (
      id: string,
      body: {
        name: string;
        workItemKind?: WorkItemKind;
        description?: string;
        slug?: string;
      },
    ) =>
      request<TenantProduct>(`/org-units/${id}/work-items`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    launch: (
      id: string,
      body: { task: string; productId?: string; presetId?: string },
    ) =>
      request<{ runId: string; workflowId: string; workflowName: string; productId: string | null }>(
        `/org-units/${id}/launch`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    artifacts: (id: string) =>
      request<import("./org-types").Artifact[]>(`/org-units/${id}/artifacts`),
    updateArtifactStatus: (artifactId: string, status: string) =>
      request<import("./org-types").Artifact>(`/artifacts/${artifactId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
  orgStudio: {
    templates: () => request<import("./org-types").BusinessTemplateSummary[]>("/org-studio/templates"),
    propose: (body: { templateSlug?: string; name?: string; description?: string }) =>
      request<import("./org-types").OrgStudioProposal>("/org-studio/propose", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    apply: (body: {
      proposal: import("./org-types").OrgStudioProposal;
      name?: string;
      slug?: string;
      config?: Record<string, unknown>;
      createWorkItem?: boolean;
      workItemKind?: WorkItemKind;
      approvedNewSkillNames?: string[];
    }) =>
      request<{
        orgUnit: import("./org-types").OrgUnit;
        agentsCreated: string[];
        workItem: TenantProduct | null;
      }>(
        "/org-studio/apply",
        { method: "POST", body: JSON.stringify(body) },
      ),
  },
  catalogStudio: {
    skills: {
      propose: (body: { brief: string }) =>
        request<import("./catalog-studio-types").SkillStudioProposal>(
          "/catalog-studio/skills/propose",
          { method: "POST", body: JSON.stringify(body) },
        ),
      apply: (body: {
        proposal: import("./catalog-studio-types").SkillStudioProposal;
        approved: boolean;
      }) =>
        request<{ skill: Skill | undefined; created: boolean; reused: boolean }>(
          "/catalog-studio/skills/apply",
          { method: "POST", body: JSON.stringify(body) },
        ),
    },
    agents: {
      propose: (body: { brief: string; orgUnitId?: string }) =>
        request<import("./catalog-studio-types").AgentStudioProposal>(
          "/catalog-studio/agents/propose",
          { method: "POST", body: JSON.stringify(body) },
        ),
      apply: (body: {
        proposal: import("./catalog-studio-types").AgentStudioProposal;
        approved: boolean;
        approvedNewSkillNames?: string[];
        orgUnitId?: string;
      }) =>
        request<{
          agent: Agent | undefined;
          created: boolean;
          reused: boolean;
          skillsCreated: string[];
        }>("/catalog-studio/agents/apply", {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
  },
};
