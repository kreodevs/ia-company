import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Agent } from "../lib/api";
import ModelAutocomplete from "./ModelAutocomplete";

type ProviderChoice = "inherit" | NonNullable<Agent["provider"]>;
type CatalogProvider = "openrouter" | "tokenlab" | "replicate";

interface AgentModelFieldsProps {
  provider: ProviderChoice;
  model: string;
  modelKind: Agent["modelKind"];
  onProviderChange: (provider: ProviderChoice) => void;
  onModelChange: (model: string) => void;
  onModelKindChange: (modelKind: Agent["modelKind"]) => void;
}

export default function AgentModelFields({
  provider,
  model,
  modelKind,
  onProviderChange,
  onModelChange,
  onModelKindChange,
}: AgentModelFieldsProps) {
  const { t } = useTranslation();
  const [tenantLlm, setTenantLlm] = useState<{
    platformProvider: string;
    platformModel: string;
    defaultModel: string | null;
  } | null>(null);

  useEffect(() => {
    void api.tenantSettings
      .getLlm()
      .then(setTenantLlm)
      .catch(() => setTenantLlm(null));
  }, []);

  const effectiveProvider = provider === "inherit" ? tenantLlm?.platformProvider ?? "…" : provider;
  const effectiveModel =
    model.trim() ||
    tenantLlm?.defaultModel ||
    tenantLlm?.platformModel ||
    t("workflows.agents.inheritModel");

  const catalogProvider = useMemo((): CatalogProvider | null => {
    if (provider === "inherit" || provider === "custom") return null;
    return provider;
  }, [provider]);

  const suggestReplicate = modelKind === "image" || modelKind === "audio";

  const kindLabel =
    modelKind === "chat"
      ? t("workflows.agents.modelKindChat")
      : modelKind === "image"
        ? t("workflows.agents.modelKindImage")
        : t("workflows.agents.modelKindAudio");

  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-4">
      <p className="text-sm text-[var(--color-muted-foreground)]">{t("workflows.agents.llmHint")}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          {t("common.provider")}
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={provider}
            onChange={(e) => {
              const next = e.target.value as ProviderChoice;
              onProviderChange(next);
              if ((modelKind === "image" || modelKind === "audio") && next === "inherit") {
                onProviderChange("replicate");
              }
            }}
          >
            <option value="inherit">{t("workflows.agents.inheritProvider")}</option>
            <option value="openrouter">{t("common.openrouter")}</option>
            <option value="tokenlab">{t("common.tokenlabLemonData")}</option>
            <option value="custom">{t("common.custom")}</option>
            <option value="replicate">{t("common.replicate")}</option>
          </select>
        </label>

        <label className="block text-sm">
          {t("workflows.agents.modelKind")}
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={modelKind}
            onChange={(e) => {
              const next = e.target.value as Agent["modelKind"];
              onModelKindChange(next);
              if ((next === "image" || next === "audio") && provider === "inherit") {
                onProviderChange("replicate");
              }
            }}
          >
            <option value="chat">{t("workflows.agents.modelKindChat")}</option>
            <option value="image">{t("workflows.agents.modelKindImage")}</option>
            <option value="audio">{t("workflows.agents.modelKindAudio")}</option>
          </select>
        </label>
      </div>

      {suggestReplicate && provider !== "replicate" ? (
        <p className="text-xs text-[var(--color-primary)]">{t("workflows.agents.replicateKindHint")}</p>
      ) : null}

      <label className="block text-sm">
        {t("common.model")}
        {catalogProvider ? (
          <ModelAutocomplete
            catalog="tenant"
            provider={catalogProvider}
            value={model}
            onChange={onModelChange}
          />
        ) : (
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-sm"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder={
              provider === "inherit"
                ? t("workflows.agents.inheritModelPlaceholder")
                : t("workflows.agents.customModelPlaceholder")
            }
          />
        )}
      </label>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {t("workflows.agents.effectiveLlmPreview", {
          provider: effectiveProvider,
          model: effectiveModel,
          kind: kindLabel,
        })}
      </p>
    </div>
  );
}
