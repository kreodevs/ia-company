import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function isApiKeyConfigured(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function hostFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).host;
  } catch {
    return url.trim();
  }
}

type LlmProviderCredentialPanelProps = {
  title: string;
  configured: boolean;
  summaryDetail?: string | null;
  hint?: string;
  children: ReactNode;
};

export default function LlmProviderCredentialPanel({
  title,
  configured,
  summaryDetail,
  hint,
  children,
}: LlmProviderCredentialPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!configured);

  useEffect(() => {
    setOpen(!configured);
  }, [configured]);

  return (
    <details
      className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/40"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${configured ? "bg-[var(--color-accent)]" : "bg-[var(--color-muted-foreground)]/40"}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          {summaryDetail ? (
            <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
              {summaryDetail}
            </span>
          ) : null}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
            configured
              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
              : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
          }`}
        >
          {configured
            ? t("admin.platformSettings.defaultLlm.apiKeyConfigured")
            : t("admin.platformSettings.defaultLlm.apiKeyMissing")}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-xs text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="space-y-3 border-t border-[var(--color-border)] px-4 py-4">
        {hint ? <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p> : null}
        {children}
      </div>
    </details>
  );
}
