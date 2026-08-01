import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GitBranch, Play } from "lucide-react";
import { api, type OfficeProcedureSummary } from "../../lib/api";
import { agentDisplayLabel } from "../../lib/office-visual";
import Button from "../ui/Button";

export interface DepartmentProcedureSelection {
  workflowId: string;
  serviceId: string | null;
  prompt: string;
}

interface DepartmentProceduresPanelProps {
  departmentSlug?: string;
  orgUnitId?: string;
  onUseProcedure: (selection: DepartmentProcedureSelection) => void;
}

function serviceIdToI18nKey(serviceId: string): string {
  return serviceId.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function examplePromptForProcedure(
  procedure: OfficeProcedureSummary,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (procedure.serviceId) {
    const key = `office.serviceTemplates.${serviceIdToI18nKey(procedure.serviceId)}.example`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return t("office.procedures.defaultPrompt", { name: procedure.procedureLabel });
}

export default function DepartmentProceduresPanel({
  departmentSlug,
  orgUnitId,
  onUseProcedure,
}: DepartmentProceduresPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<OfficeProcedureSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = departmentSlug
      ? api.office.departmentProcedures(departmentSlug)
      : orgUnitId
        ? api.orgUnits.procedures(orgUnitId)
        : Promise.resolve({ items: [] });

    load
      .then((response) => setItems(response.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [departmentSlug, orgUnitId]);

  return (
    <section className="office-panel office-dept-procedures">
      <div className="office-dept-procedures-head">
        <h2 className="office-panel-title">{t("office.procedures.title")}</h2>
        <p className="office-dept-procedures-subtitle">{t("office.procedures.subtitle")}</p>
      </div>

      {loading ? (
        <p className="office-empty">{t("office.procedures.loading")}</p>
      ) : items.length === 0 ? (
        <p className="office-empty">{t("office.procedures.empty")}</p>
      ) : (
        <ul className="office-dept-procedures-list">
          {items.map((procedure) => (
            <li key={procedure.id} className="office-dept-procedure-card">
              <div className="office-dept-procedure-main">
                <h3 className="office-dept-procedure-title">{procedure.procedureLabel}</h3>
                {procedure.description ? (
                  <p className="office-dept-procedure-desc">{procedure.description}</p>
                ) : null}
                {procedure.agentNames.length > 0 ? (
                  <p className="office-dept-procedure-agents">
                    {procedure.agentNames
                      .map((name) =>
                        agentDisplayLabel({ name, role: null }, t),
                      )
                      .join(" → ")}
                  </p>
                ) : null}
                <p className="office-dept-procedure-meta">
                  {t("office.procedures.stepCount", { count: procedure.stepCount })}
                </p>
              </div>
              <div className="office-dept-procedure-actions">
                <Button
                  size="sm"
                  onClick={() =>
                    onUseProcedure({
                      workflowId: procedure.id,
                      serviceId: procedure.serviceId,
                      prompt: examplePromptForProcedure(procedure, t),
                    })
                  }
                >
                  <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
                  {t("office.procedures.use")}
                </Button>
                <Link
                  to={`/office/workflows/${procedure.id}`}
                  className="office-link-btn office-link-btn-muted"
                >
                  <GitBranch className="h-3.5 w-3.5" aria-hidden />
                  {t("office.procedures.view")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
