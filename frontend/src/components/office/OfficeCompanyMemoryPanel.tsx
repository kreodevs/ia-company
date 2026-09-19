import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, ChevronRight } from "lucide-react";
import { api, type TenantConsensus } from "../../lib/api";
import Panel from "../ui/Panel";

interface OfficeCompanyMemoryPanelProps {
  compact?: boolean;
}

function previewText(content: string, max = 160): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

export default function OfficeCompanyMemoryPanel({ compact = false }: OfficeCompanyMemoryPanelProps) {
  const { t } = useTranslation();
  const [record, setRecord] = useState<TenantConsensus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.consensus
      .get()
      .then(setRecord)
      .catch(() => setRecord(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Panel title={t("office.memoria.companyPanel.title")} bodySize="sm">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </Panel>
    );
  }

  const nextAction = record?.nextAction?.trim();
  const contentPreview = record?.content ? previewText(record.content) : "";

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <Brain className="h-4 w-4" aria-hidden />
          {t("office.memoria.companyPanel.title")}
        </span>
      }
      bodySize="sm"
      className="office-company-memory-panel"
    >
      {nextAction ? (
        <p className="office-memory-next-action">
          <span className="office-memory-label">{t("consensus.nextAction")}:</span> {nextAction}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("office.memoria.companyPanel.emptyNextAction")}</p>
      )}

      {!compact && contentPreview ? (
        <p className="office-memory-preview">{contentPreview}</p>
      ) : null}

      {record?.companyPhase ? (
        <p className="office-memory-meta">
          {t("consensus.kpis.phase")}: {t(`phase.${record.companyPhase}`, { defaultValue: record.companyPhase })}
        </p>
      ) : null}

      <Link to="/office/memoria?tab=empresa" className="office-roi-link office-memory-link">
        {t("office.memoria.companyPanel.open")} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </Panel>
  );
}
