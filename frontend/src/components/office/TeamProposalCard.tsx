import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { OfficeTaskPlan } from "../../lib/api";
import Button from "../ui/Button";

const AGENT_EMOJI: Record<string, string> = {
  "coordinator-chief": "🎩",
  "ceo-bezos": "👔",
  "research-thompson": "🔍",
  "critic-munger": "🧐",
  "cfo-campbell": "💰",
  "fullstack-dhh": "💻",
  "marketing-godin": "📣",
};

function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `radial-gradient(circle at 30% 25%, hsl(${hue} 90% 70%) 0%, hsl(${hue} 70% 45%) 100%)`;
}

export interface TeamProposalCardProps {
  plan: OfficeTaskPlan;
  onExecute: () => void;
  executing?: boolean;
  compact?: boolean;
}

export default function TeamProposalCard({
  plan,
  onExecute,
  executing = false,
  compact = false,
}: TeamProposalCardProps) {
  const { t } = useTranslation();

  return (
    <div className={`office-proposal ${compact ? "office-proposal-compact" : ""}`}>
      <p className="office-coordinator-note">
        <strong>{t("office.task.coordinatorSays")}: </strong>
        {t(plan.coordinatorNoteKey as "office.notes.default")}
      </p>
      <div className="office-agent-chips">
        {plan.agents.map((agent) => (
          <div key={agent.id} className="office-agent-chip">
            <span
              className="office-agent-chip-avatar"
              style={{ background: avatarGradient(agent.name) }}
            >
              {AGENT_EMOJI[agent.name] ?? "🧑‍💼"}
            </span>
            <span>
              <strong>{agent.name.replace(/-/g, " ")}</strong>
              {!compact && (
                <>
                  <br />
                  <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
                    {t(agent.reasonKey as "office.reasons.contributes")}
                  </span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      {plan.missingAgentRoles && plan.missingAgentRoles.length > 0 && (
        <div className="office-missing-roles mt-4 rounded-lg border border-[var(--color-border)] p-3">
          <p className="text-sm font-medium">{t("office.task.missingRoleTitle")}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {t("office.task.missingRoleHint")}
          </p>
          <ul className="mt-2 space-y-2">
            {plan.missingAgentRoles.map((role) => (
              <li key={role.name}>
                <Link
                  to={`/settings/specialists?tab=create-agent&brief=${encodeURIComponent(role.suggestedBrief)}`}
                  className="text-sm text-[var(--color-primary)] underline"
                >
                  {t("office.task.createMissingRole", { name: role.name.replace(/-/g, " ") })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="office-estimates">
        <div className="office-estimate">
          <p className="office-estimate-label">{t("office.task.scope")}</p>
          <p className="office-estimate-value" style={{ fontSize: "0.78rem", fontWeight: 500 }}>
            {plan.productName ?? t("office.task.scopeCompany")}
          </p>
        </div>
        <div className="office-estimate">
          <p className="office-estimate-label">{t("office.task.estimatedCost")}</p>
          <p className="office-estimate-value">
            {t("office.task.costRange", {
              min: plan.estimatedCostUsd.min.toFixed(2),
              max: plan.estimatedCostUsd.max.toFixed(2),
            })}
          </p>
        </div>
        <div className="office-estimate">
          <p className="office-estimate-label">{t("office.task.estimatedTime")}</p>
          <p className="office-estimate-value">
            {t("office.task.minutes", {
              min: plan.estimatedMinutes.min,
              max: plan.estimatedMinutes.max,
            })}
          </p>
        </div>
        <div className="office-estimate">
          <p className="office-estimate-label">{t("office.task.deliverable")}</p>
          <p className="office-estimate-value" style={{ fontSize: "0.78rem", fontWeight: 500 }}>
            {t(plan.deliverableKey as "office.deliverables.marketReport")}
          </p>
        </div>
      </div>
      <div className="office-chat-plan-actions">
        <Button onClick={onExecute} disabled={executing}>
          {executing ? t("office.task.executing") : t("office.task.execute")}
        </Button>
      </div>
    </div>
  );
}
