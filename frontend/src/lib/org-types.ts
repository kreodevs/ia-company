/** Frontend mirror of src/lib/org-os-types.ts (Kreo DynamicForm-compatible). */

export interface DynamicFormFieldOption {
  label: string;
  value: string;
}

export interface DynamicFormField {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "multiselect"
    | "switch"
    | "number"
    | "color"
    | "email";
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: DynamicFormFieldOption[];
  defaultValue?: unknown;
  colSpan?: number;
}

export interface DynamicFormSection {
  title: string;
  description?: string;
  fields: DynamicFormField[];
}

export interface OrgUnitConfigSchema {
  sections?: DynamicFormSection[];
  fields?: DynamicFormField[];
}

export interface OrgUnit {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  templateId: string | null;
  config: Record<string, unknown>;
  configSchema: OrgUnitConfigSchema;
  tokens: Record<string, unknown>;
  designMd: string | null;
  isActive: boolean;
  workspacePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  orgUnitId: string;
  productId: string | null;
  type: string;
  status: string;
  title: string;
  body: Record<string, unknown>;
  previewText: string | null;
  createdByAgent: string | null;
  createdAt: string;
}

export interface BusinessTemplateSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  orgUnitType: string;
  artifactTypes: string[];
}

export interface OrgStudioProposal {
  templateSlug: string;
  templateName: string;
  orgUnitType: string;
  suggestedName: string;
  suggestedSlug: string;
  description: string;
  configSchema: OrgUnitConfigSchema;
  configDefaults: Record<string, unknown>;
  tokens: Record<string, unknown>;
  designMd: string;
  suggestedAgents: Array<{ name: string; role: string; artifactTypes?: string[] }>;
  suggestedWorkflows: string[];
  artifactTypes: string[];
  summary: string;
  mungerReview?: {
    approved: boolean;
    notes: string;
    veto?: { by: string; reason: string };
  };
  missingSkills?: Array<{ name: string; description: string; promptContent: string }>;
}

export interface OrgUnitStaffMember {
  name: string;
  role: string | null;
  provisioned: boolean;
  agentId: string | null;
  source: "template" | "added";
}

export interface OrgUnitStaffRoster {
  orgUnitId: string;
  templateRoleCount: number;
  members: OrgUnitStaffMember[];
  availableAgents: Array<{ id: string; name: string; role: string }>;
}
