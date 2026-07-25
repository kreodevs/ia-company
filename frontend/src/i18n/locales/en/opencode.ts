export const opencode = {
  settings: {
    title: "OpenCode",
    subtitle:
      "Each tenant connects to its own OpenCode server. Feature development delegates implementation there instead of coding locally.",
    enabled: "Delegate implementation to OpenCode",
    baseUrl: "OpenCode base URL",
    username: "Basic Auth username",
    password: "Basic Auth password",
    passwordHint: "Leave blank to keep the current password.",
    defaultAgent: "Default agent (optional)",
    defaultModel: "Default model (optional)",
    projectPath: "Project path on OpenCode server (optional)",
    pollIntervalMs: "Poll interval (ms)",
    maxWaitMs: "Max wait (ms)",
    autoApprovePermissions: "Auto-approve OpenCode permissions",
    save: "Save OpenCode settings",
    test: "Test connection",
    testOk: "Connection OK",
    testFail: "Connection failed",
    configured: "Ready to delegate",
    notConfigured: "Enable OpenCode and set URL + password to delegate implementation",
    platformDisabled:
      "OpenCode is disabled at platform level. Ask your superadmin to enable it under Admin → Platform settings → OpenCode.",
    serverReachHint:
      "The connection test runs from the Auto-Company API server, not your browser. Use a URL reachable from that server (localhost only works if OpenCode runs in the same container).",
    productHint:
      "Products can override these tenant defaults. Per-run overrides are available when confirming delegation.",
    tenantDefaultsHint:
      "Tenant defaults apply to all products unless a product sets its own agent, model, or path.",
    tenantDefaultOptional: "Optional — falls back to OpenCode server default",
    tenantProjectPathHint:
      "Default workspace path on OpenCode. Products without a path use this, or projects/{slug} if empty.",
  },
  productSettings: {
    title: "OpenCode for this product",
    subtitle: "These settings apply when feature development delegates implementation to OpenCode for this product.",
    inheritTenant: "Inherit tenant default",
    effectiveHint: "Effective for this product: agent {{agent}}, model {{model}}, path {{path}}",
    projectPathHint: "If empty, defaults to {{path}} on the OpenCode server.",
    save: "Save product OpenCode settings",
    saved: "Saved",
  },
  gate: {
    title: "OpenCode is not configured",
    body:
      "This feature-development run would delegate coding to OpenCode, but your tenant has no OpenCode connection. Continue with local Auto-Company agents or cancel the run.",
    continueLocal: "Continue with Auto-Company",
    cancelRun: "Cancel run",
  },
  confirm: {
    title: "Confirm OpenCode delegation",
    body:
      "Review or override the project path, model, and agent for this run. OpenCode will receive the implementation brief below.",
    delegate: "Delegate to OpenCode",
  },
  delegated: {
    title: "Delegated to OpenCode",
    body: "Implementation is running on your tenant OpenCode server. This run will resume with QA/DevOps when OpenCode finishes.",
    session: "Session ID",
    status: "Delegation status",
    cancel: "Cancel delegation",
  },
  diff: {
    title: "OpenCode result",
    session: "Session",
    stats: "+{{add}} / -{{del}}",
    empty: "No diff reported yet.",
  },
  history: {
    title: "OpenCode history",
    files: "files",
    viewRun: "View run",
  },
  activeBadge: "OpenCode active",
  externalImplementation: "External implementation in progress",
} as const;
