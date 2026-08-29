import {
  Bot,
  Clock,
  GitBranch,
  GitFork,
  Globe,
  Layers,
  Play,
  Repeat,
  Shield,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { FlowPaletteItem } from "./flowEditorTypes";

const ACTION_ICONS: Record<string, LucideIcon> = {
  run_agent: Bot,
  munger_gate: Shield,
  merge_consensus: GitBranch,
  human_wait: Clock,
  noop: Play,
  on_manual_run: Zap,
  on_schedule_tick: Clock,
  on_encargo_approved: Play,
};

const SEMANTIC_ICONS: Record<string, LucideIcon> = {
  trigger: Zap,
  condition: GitFork,
  wait: Clock,
  parallel: Layers,
  merge: GitBranch,
  loop: Repeat,
  webhook: Globe,
  subflow: GitBranch,
  action: Play,
};

export function resolveFlowIcon(
  action: string | undefined,
  nodeIcon: string | undefined,
  actionIcons?: Record<string, string>,
): LucideIcon {
  if (action && ACTION_ICONS[action]) return ACTION_ICONS[action];
  if (action && actionIcons?.[action]) {
    // Named lucide icons as strings are not resolved dynamically — fallback map
    if (actionIcons[action] === "users") return Users;
  }
  if (nodeIcon && SEMANTIC_ICONS[nodeIcon]) return SEMANTIC_ICONS[nodeIcon];
  return Play;
}

export function resolvePaletteItemIcon(
  item: FlowPaletteItem,
  actionIcons?: Record<string, string>,
): LucideIcon {
  return resolveFlowIcon(item.action, item.icon ?? item.semanticType, actionIcons);
}
