import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Rocket, Users, Workflow } from "lucide-react";
import {
  api,
  type ProductLaunchOptionAgent,
  type ProductLaunchOptionPreset,
  type ProductLaunchOptions,
  type ProductWorkPresetCategory,
} from "../../lib/api";
import Button from "../ui/Button";
import Input from "../ui/Input";

type LaunchTab = "presets" | "workflows" | "agents";

const AGENT_EMOJI: Record<string, string> = {
  "marketing-godin": "📣",
  "sales-ross": "💼",
  "operations-pg": "📈",
  "research-thompson": "🔍",
  "fullstack-dhh": "💻",
  "qa-bach": "🧪",
  "devops-hightower": "🚀",
  "ceo-bezos": "👔",
  "cfo-campbell": "💰",
  "product-norman": "🧭",
  "interaction-cooper": "🎯",
  "ui-duarte": "🎨",
  "critic-munger": "🧐",
  "cto-vogels": "🛠️",
};

export interface ProductWorkLauncherProps {
  productId: string;
  productName: string;
  compact?: boolean;
  onLaunched?: (runId: string) => void;
}

function presetLabelKey(id: string): string {
  return `productWork.presets.${id}.label`;
}

function presetDescKey(id: string): string {
  return `productWork.presets.${id}.description`;
}

function categoryLabel(
  t: (key: string) => string,
  category: ProductWorkPresetCategory,
): string {
  return t(`productWork.categories.${category}`);
}

export default function ProductWorkLauncher({
  productId,
  productName,
  compact = false,
  onLaunched,
}: ProductWorkLauncherProps) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ProductLaunchOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LaunchTab>("presets");
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.products.launchOptions(productId);
      setOptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const launch = async (body: {
    presetId?: string;
    workflowId?: string;
    agentId?: string;
  }) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.products.launch(productId, {
        ...body,
        task: task.trim() || undefined,
        mergeConsensus: true,
        setFocus: true,
      });
      onLaunched?.(result.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const tabs = useMemo(
    () =>
      [
        { id: "presets" as const, label: t("productWork.tabs.presets"), icon: Rocket },
        { id: "workflows" as const, label: t("productWork.tabs.workflows"), icon: Workflow },
        { id: "agents" as const, label: t("productWork.tabs.agents"), icon: Users },
      ] satisfies Array<{ id: LaunchTab; label: string; icon: typeof Rocket }>,
    [t],
  );

  const renderPreset = (preset: ProductLaunchOptionPreset) => (
    <li
      key={preset.id}
      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{t(presetLabelKey(preset.id))}</span>
          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {categoryLabel(t, preset.category)}
          </span>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {t("productWork.agentCount", { count: preset.agentCount })}
          </span>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">{t(presetDescKey(preset.id))}</p>
      </div>
      <Button
        size="sm"
        disabled={busy || !preset.available}
        onClick={() => void launch({ presetId: preset.id })}
      >
        <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {t("productWork.launch")}
      </Button>
    </li>
  );

  const renderWorkflow = (workflow: ProductLaunchOptions["workflows"][number]) => (
    <li
      key={workflow.id}
      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3"
    >
      <div className="min-w-0 space-y-1">
        <span className="font-medium">{workflow.name}</span>
        {workflow.description && (
          <p className="text-sm text-[var(--color-muted-foreground)]">{workflow.description}</p>
        )}
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          {t("productWork.stepCount", { count: workflow.stepCount })}
        </p>
      </div>
      <Button size="sm" disabled={busy} onClick={() => void launch({ workflowId: workflow.id })}>
        <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {t("productWork.launch")}
      </Button>
    </li>
  );

  const renderAgent = (agent: ProductLaunchOptionAgent) => (
    <li
      key={agent.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-lg" aria-hidden>
          {AGENT_EMOJI[agent.name] ?? "🤖"}
        </span>
        <div>
          <p className="font-medium">{agent.role}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">{agent.name}</p>
        </div>
      </div>
      <Button size="sm" disabled={busy} onClick={() => void launch({ agentId: agent.id })}>
        <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {t("productWork.assignAgent")}
      </Button>
    </li>
  );

  return (
    <section
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="mb-3 space-y-1">
        <h3 className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>
          {t("productWork.title")}
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("productWork.subtitle", { name: productName })}
        </p>
      </div>

      <div className="mb-3 space-y-2">
        <label htmlFor={`product-work-task-${productId}`} className="text-xs font-medium">
          {t("productWork.taskLabel")}
        </label>
        <Input
          id={`product-work-task-${productId}`}
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder={t("productWork.taskPlaceholder")}
          disabled={busy}
        />
        <p className="text-xs text-[var(--color-muted-foreground)]">{t("productWork.taskHint")}</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-1 rounded-lg border border-[var(--color-border)] p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`interactive flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium sm:flex-none sm:px-3 ${
              tab === id
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("productWork.loading")}</p>
      ) : !options ? (
        <p className="text-sm text-[var(--color-destructive)]">{t("productWork.loadFailed")}</p>
      ) : (
        <ul className="space-y-2">
          {tab === "presets" && options.presets.map(renderPreset)}
          {tab === "workflows" &&
            (options.workflows.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("productWork.noWorkflows")}
              </p>
            ) : (
              options.workflows.map(renderWorkflow)
            ))}
          {tab === "agents" && options.agents.map(renderAgent)}
        </ul>
      )}

      {error && (
        <p className="mt-2 text-sm text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
