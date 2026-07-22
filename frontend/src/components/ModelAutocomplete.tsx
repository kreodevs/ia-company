import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type LlmModelOption, type PlatformSettings } from "../lib/api";

type Provider = Extract<PlatformSettings["defaultProvider"], "openrouter" | "tokenlab">;

interface ModelAutocompleteProps {
  provider: Provider;
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

function formatPrice(value: number | null, locale: string): string {
  if (value === null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export default function ModelAutocomplete({
  provider,
  value,
  onChange,
  className = "",
}: ModelAutocompleteProps) {
  const { t, i18n } = useTranslation();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [models, setModels] = useState<LlmModelOption[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setModels([]);

    void api.admin.platformSettings
      .listModels(provider)
      .then((res) => {
        if (!cancelled) setModels(res.models);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("admin.platformSettings.defaultLlm.modelsLoadFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provider, t]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models.slice(0, 40);
    return models
      .filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [models, query]);

  const selected = useMemo(
    () => models.find((m) => m.id === value) ?? null,
    [models, value],
  );

  const commitValue = (modelId: string) => {
    onChange(modelId);
    setQuery(modelId);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="mt-1 w-full rounded-[var(--radius-inputs)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
        value={query}
        placeholder={t("admin.platformSettings.defaultLlm.modelPlaceholder")}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && filtered[0]) {
            e.preventDefault();
            commitValue(filtered[0].id);
          }
        }}
      />

      {selected ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {t("admin.platformSettings.defaultLlm.modelPricing", {
            input: formatPrice(selected.inputPer1MTokens, i18n.language),
            output: formatPrice(selected.outputPer1MTokens, i18n.language),
          })}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {t("admin.platformSettings.defaultLlm.modelsLoading")}
        </p>
      ) : null}

      {error ? <p className="mt-1 text-xs text-[var(--color-destructive)]">{error}</p> : null}

      {open && !loading && filtered.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-none"
        >
          {filtered.map((model) => (
            <li key={model.id} role="option" aria-selected={model.id === value}>
              <button
                type="button"
                className="interactive flex w-full flex-col gap-0.5 border-b border-[var(--color-border)] px-3 py-2 text-left last:border-b-0 hover:bg-[var(--color-muted)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commitValue(model.id)}
              >
                <span className="text-sm font-medium text-[var(--color-foreground)]">{model.id}</span>
                {model.name !== model.id ? (
                  <span className="text-xs text-[var(--color-muted-foreground)]">{model.name}</span>
                ) : null}
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {t("admin.platformSettings.defaultLlm.modelPricing", {
                    input: formatPrice(model.inputPer1MTokens, i18n.language),
                    output: formatPrice(model.outputPer1MTokens, i18n.language),
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open && !loading && !error && filtered.length === 0 && query.trim() ? (
        <p className="absolute z-20 mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
          {t("admin.platformSettings.defaultLlm.modelsEmpty")}
        </p>
      ) : null}
    </div>
  );
}
