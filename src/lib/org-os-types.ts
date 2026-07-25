/** Kreo-compatible DynamicForm field definition (subset). */
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

export interface SuggestedAgentDef {
  name: string;
  role: string;
  systemPrompt: string;
  skillNames?: string[];
  artifactTypes?: string[];
}

export interface BusinessTemplateDefinition {
  configSchema: OrgUnitConfigSchema;
  configDefaults: Record<string, unknown>;
  tokens: Record<string, unknown>;
  designMd: string;
  suggestedAgents: SuggestedAgentDef[];
  suggestedWorkflows?: string[];
  artifactTypes?: string[];
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
  suggestedAgents: SuggestedAgentDef[];
  suggestedWorkflows: string[];
  artifactTypes: string[];
  summary: string;
}
