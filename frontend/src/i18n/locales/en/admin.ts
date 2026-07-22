export const admin = {
  dashboard: {
    loading: "Loading dashboard…",
    title: "Superadmin Dashboard",
    needTenantBanner:
      "Select a tenant from the dropdown to access Agents, Workflows, and Runs — or create one below with an owner account.",
    stats: {
      tenants: "Tenants",
      tenantAgents: "Tenant agents",
      tenantWorkflows: "Tenant workflows",
      totalRuns: "Total runs",
    },
    platformTemplates: {
      title: "Platform templates",
      subtitle:
        "Seeded from .claude/ — cloned on tenant create; sync to existing tenants from Templates.",
      agentTemplates: "{{count}} agent templates",
      skillTemplates: "{{count}} skill templates",
      workflowTemplates: "{{count}} workflow templates",
      platformSettingsLink: "Platform settings →",
      manageTemplatesLink: "Manage templates →",
    },
    createTenant: {
      title: "Create tenant",
      organizationName: "Organization name",
      ownerEmail: "Owner email (optional)",
      ownerName: "Owner name (optional)",
      ownerPassword: "Owner password (optional, min 8)",
      createTenant: "Create tenant",
      createFailed: "Failed to create tenant",
    },
    tenants: {
      title: "Tenants",
      columns: {
        name: "Name",
        slug: "Slug",
        users: "Users",
        workflows: "Workflows",
      },
      impersonate: "Impersonate",
      syncTemplates: "Sync templates",
      syncUpdateConfirm:
        'Update mode overwrites matching templates for "{{name}}" from platform. Continue?',
      syncMergeConfirm:
        'Sync platform templates to "{{name}}"? Missing agents, skills, and workflows will be added.',
      syncSuccess:
        "Synced {{name}} ({{mode}}): +{{agentsAdded}} agents, +{{skillsAdded}} skills, +{{workflowsAdded}} workflows",
      syncUpdated: " · updated {{count}}",
    },
    auditLog: {
      title: "Audit log",
      columns: {
        time: "Time",
        action: "Action",
        actor: "Actor",
        tenant: "Tenant",
      },
      empty: "No audit events yet.",
      noTenant: "—",
    },
  },
  platformSettings: {
    loading: "Loading platform settings…",
    title: "Platform Settings",
    subtitle:
      "Application configuration (LLM keys, email, limits). Infrastructure secrets stay in .env.",
    saved: "Platform settings saved",
    general: {
      title: "General",
      publicUrl: "Public URL",
      publicUrlPlaceholder: "https://app.example.com",
      authRateLimit: "Auth rate limit / min",
      executeRateLimit: "Execute rate limit / min",
      shellTimeout: "Shell timeout (ms)",
      schedulerTick: "Scheduler tick (ms)",
    },
    defaultLlm: {
      title: "Shared LLM (all tenants)",
      subtitle:
        "Choose OpenRouter or TokenLab. Only the active provider is used at runtime; configure that provider's API key.",
      temperature: "Temperature",
      tokenlabSection: "TokenLab / LemonData",
      openrouterSection: "OpenRouter",
      httpReferer: "HTTP-Referer",
      customSection: "Custom (OpenAI-compatible)",
    },
    email: {
      title: "Email (Resend)",
      resendApiKey: "Resend API key",
      fromAddress: "From address",
      fromPlaceholder: "Auto Company <noreply@yourdomain.com>",
    },
    github: {
      title: "GitHub (autonomous git/gh tools)",
      token: "GitHub personal access token",
      tokenPlaceholder: "ghp_… or fine-grained token",
      hint: "Used by workflow agents for git_commit and repo operations. Can also be set via GH_TOKEN in server environment.",
    },
    save: "Save platform settings",
  },
  templates: {
    title: "Platform Templates",
    subtitle: "Global templates cloned to new tenants · sourced from .claude/",
    reseed: "Reseed from .claude/",
    syncSection: {
      title: "Sync to existing tenants",
      subtitle:
        "Push platform templates to existing tenants. Matching uses platform id (rename-safe), then name.",
      mergeLabel: "Merge — add missing only",
      updateLabel: "Update — also overwrite matching templates",
      syncAll: "Sync all tenants",
      syncSelected: "Sync selected ({{count}})",
      updateConfirm:
        "Update mode overwrites matching tenant agents/skills/workflows from platform templates (matched by platform id or name). Continue?",
      syncSummary: "Synced {{count}} tenant(s) ({{mode}}): {{summary}}",
      stats: {
        skillsAdded: "{{count}} skills added",
        skillsUpdated: "{{count}} skills updated",
        skillsLinked: "{{count}} skills linked",
        agentsAdded: "{{count}} agents added",
        agentsUpdated: "{{count}} agents updated",
        agentsLinked: "{{count}} agents linked",
        workflowsAdded: "{{count}} workflows added",
        workflowsUpdated: "{{count}} workflows updated",
        workflowsLinked: "{{count}} workflows linked",
      },
      reseedSuccess: "Reseeded {{agents}} agents, {{skills}} skills, {{workflows}} workflows",
    },
    tabs: {
      agents: "agents",
      skills: "skills",
      workflows: "workflows",
    },
    agents: {
      createTemplate: "+ Create agent template",
      agentNamePrompt: "Agent template name",
      rolePrompt: "Role label",
      created: 'Created agent template "{{name}}"',
      saveTemplate: "Save agent template",
      saved: "Agent template saved",
    },
    skills: {
      createTemplate: "+ Create skill template",
      skillNamePrompt: "Skill template name",
      created: 'Created skill template "{{name}}"',
      saveTemplate: "Save skill template",
      saved: "Skill template saved",
    },
    workflows: {
      title: "Workflow templates",
      subtitle:
        "Global pipelines cloned to new tenants. Open a template to edit agents and connections in the visual editor.",
      searchPlaceholder: "Search workflows or agents…",
      newNamePlaceholder: "new-workflow-name",
      emptyTitle: "No workflow templates yet",
      emptySearchTitle: "No workflows match your search",
      emptySubtitle:
        "Create a template to define a reusable agent pipeline for every new tenant.",
      emptySearchSubtitle: "Try another search term or clear the filter.",
      deleteConfirm: 'Delete platform workflow template "{{name}}"?',
      deleted: 'Deleted workflow template "{{name}}"',
    },
  },
  impersonation: {
    label: "Impersonate tenant",
    superadminView: "Superadmin view",
    viewingAs: "Viewing as {{name}}",
  },
} as const;
