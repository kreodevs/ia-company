import type { Edge, Node, NodeTypes } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";

export type FlowSemanticType =
  | "trigger"
  | "action"
  | "condition"
  | "wait"
  | "parallel"
  | "merge"
  | "loop"
  | "webhook"
  | "subflow";

export type FlowNodeExecutionStatus = "idle" | "running" | "success" | "error";

export interface FlowNodeData {
  label: string;
  semanticType: FlowSemanticType;
  action?: string;
  params?: Record<string, unknown>;
  description?: string;
  dispatchable?: boolean;
  icon?: string;
  executionStatus?: FlowNodeExecutionStatus;
  executionMessage?: string;
  triggerVariables?: FlowTriggerVariable[];
}

export interface FlowTriggerVariable {
  path: string;
  label: string;
  description?: string;
  example?: string;
}

export interface FlowPaletteItem {
  label: string;
  description: string;
  semanticType: FlowSemanticType;
  action?: string;
  icon?: string;
}

export interface FlowPaletteGroup {
  type: string;
  title: string;
  items: FlowPaletteItem[];
}

export type FlowConfigFieldGroup = "general" | "input" | "output";

export interface FlowConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "datasource";
  required?: boolean;
  defaultValue?: string | number | boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  dataSourceKey?: string;
  dataSourceLabel?: string;
  mapsTo?: string;
  /** Groups fields in the config panel (run_agent input/output tuning). */
  group?: FlowConfigFieldGroup;
  helpText?: string;
}

export interface FlowHandleDefinition {
  id: string;
  label?: string;
  position?: number;
  color?: string;
}

export interface FlowNodeTypePreset {
  variant?: "primary" | "success" | "warning" | "info" | "accent" | "muted";
  dashed?: boolean;
  showTargetHandle?: boolean;
  showSourceHandle?: boolean;
  sourceHandles?: FlowHandleDefinition[];
  footerLabels?: string[];
  executeLabel?: string;
}

export interface FlowConnectionRule {
  from: FlowSemanticType | FlowSemanticType[];
  to: FlowSemanticType | FlowSemanticType[];
  handles?: string[];
}

export type FlowConnectionRules = FlowConnectionRule[];

export interface FlowDataSourceOption {
  value: string;
  label: string;
  id?: string;
  meta?: Record<string, unknown>;
}

export type FlowDataSources = Record<string, FlowDataSourceOption[]>;

export interface FlowI18n {
  searchPlaceholder?: string;
  paletteHint?: string;
  emptyPalette?: string;
  expandPalette?: string;
  collapsePalette?: string;
  executeWorkflow?: string;
  executingWorkflow?: string;
  traceTitle?: string;
  traceSkipped?: string;
  traceBranch?: string;
  handleTrue?: string;
  handleFalse?: string;
  configureLabel?: string;
  triggerLabel?: string;
  closePanel?: string;
  handlerLabel?: string;
  eventLabel?: string;
  executeSuccess?: string;
  executeError?: string;
  availableVariables?: string;
  insertVariable?: string;
  emptyDataSource?: string;
  noConfigFields?: string;
  paramsJson?: string;
  duplicateNode?: string;
  deleteNode?: string;
  executeLabels?: Partial<Record<FlowSemanticType, string>>;
  dataSourceLabels?: Record<string, string>;
  stepIOHint?: string;
  stepInputsTitle?: string;
  stepInputsHint?: string;
  stepOutputsTitle?: string;
  stepOutputsHint?: string;
  configGroupGeneral?: string;
  configGroupInput?: string;
  configGroupOutput?: string;
}

export interface FlowEditorPreset {
  id?: string;
  palette?: FlowPaletteGroup[];
  triggerVariables?: Record<string, FlowTriggerVariable[]>;
  actionConfigFields?: Record<string, FlowConfigField[]>;
  connectionRules?: FlowConnectionRules;
  validators?: FlowGraphValidator[];
  i18n?: FlowI18n;
  nodeTypes?: Partial<Record<FlowSemanticType, FlowNodeTypePreset>>;
  actionIcons?: Record<string, string>;
  defaultTriggerAction?: string;
}

export interface ResolvedFlowEditorConfig {
  palette: FlowPaletteGroup[];
  triggerVariables: Record<string, FlowTriggerVariable[]>;
  actionConfigFields: Record<string, FlowConfigField[]>;
  connectionRules: FlowConnectionRules;
  validators: FlowGraphValidator[];
  i18n: FlowI18n;
  nodeTypes: Partial<Record<FlowSemanticType, FlowNodeTypePreset>>;
  actionIcons: Record<string, string>;
  defaultTriggerAction: string;
}

export interface FlowEditorProps {
  nodes?: Node[];
  edges?: Edge[];
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  onExecuteNode?: (payload: FlowNodeExecutePayload) => Promise<FlowNodeExecuteResult | void>;
  onExecuteWorkflow?: (payload: FlowGraphPayload) => Promise<void>;
  triggerType?: string;
  readOnly?: boolean;
  height?: number | string;
  className?: string;
  preset?: FlowEditorPreset;
  palette?: FlowPaletteGroup[];
  triggerVariables?: Record<string, FlowTriggerVariable[]>;
  actionConfigFields?: Record<string, FlowConfigField[]>;
  connectionRules?: FlowConnectionRules;
  dataSources?: FlowDataSources;
  nodeTypes?: NodeTypes;
  i18n?: FlowI18n;
  showExecutionTrace?: boolean;
  paletteVariant?: "floating" | "header";
}

export interface FlowNodeExecutePayload {
  nodeId: string;
  semanticType: FlowSemanticType;
  action?: string;
  params: Record<string, unknown>;
  label: string;
}

export interface FlowNodeExecuteResult {
  success?: boolean;
  message?: string;
}

export interface FlowGraphPayload {
  nodes: Node[];
  edges: Edge[];
  triggerType?: string;
}

export interface FlowValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  nodeId?: string;
  edgeId?: string;
}

export interface FlowGraphValidationResult {
  valid: boolean;
  issues: FlowValidationIssue[];
}

export interface FlowGraphValidatorContext {
  nodes: Node[];
  edges: Edge[];
  i18n: FlowI18n;
}

export type FlowGraphValidator = (
  ctx: FlowGraphValidatorContext,
) => FlowValidationIssue | null;

export interface FlowExecutionStep {
  nodeId: string;
  label: string;
  semanticType: FlowSemanticType;
  status: "idle" | "running" | "success" | "error" | "skipped";
  skipped?: boolean;
  branch?: "true" | "false";
  branchLabel?: string;
  message?: string;
  timestamp: number;
}

export type FlowIconResolver = LucideIcon;
