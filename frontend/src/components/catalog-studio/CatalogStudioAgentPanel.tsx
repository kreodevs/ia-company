import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { AgentStudioProposal } from "../../lib/catalog-studio-types";
import { translateApiError } from "../../lib/translate-error";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import MungerReviewPanel from "./MungerReviewPanel";

interface CatalogStudioAgentPanelProps {
  onApplied?: () => void;
  initialBrief?: string;
  initialOrgUnitId?: string;
  embedded?: boolean;
}

export default function CatalogStudioAgentPanel({
  onApplied,
  initialBrief = "",
  initialOrgUnitId = "",
  embedded = false,
}: CatalogStudioAgentPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [brief, setBrief] = useState(initialBrief);
  const [orgUnitId, setOrgUnitId] = useState(initialOrgUnitId);
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [proposal, setProposal] = useState<AgentStudioProposal | null>(null);
  const [approvedAgent, setApprovedAgent] = useState(false);
  const [approvedSkills, setApprovedSkills] = useState<Set<string>>(new Set());
  const [proposing, setProposing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (initialBrief) setBrief(initialBrief);
  }, [initialBrief]);

  useEffect(() => {
    if (initialOrgUnitId) setOrgUnitId(initialOrgUnitId);
  }, [initialOrgUnitId]);

  useEffect(() => {
    api.orgUnits
      .list()
      .then((units) => setOrgUnits(units.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => undefined);
  }, []);

  const mungerBlocked = Boolean(proposal?.mungerReview && !proposal.mungerReview.approved);
  const needsAgentApproval = Boolean(proposal && !proposal.reuse && proposal.agent);

  const toggleSkill = (name: string, checked: boolean) => {
    setApprovedSkills((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const allNewSkillsApproved =
    !proposal?.newSkills.length ||
    proposal.newSkills.every((s) => approvedSkills.has(s.name));

  const runPropose = async () => {
    setProposing(true);
    setError(null);
    setDone(false);
    setApprovedAgent(false);
    setApprovedSkills(new Set());
    try {
      const p = await api.catalogStudio.agents.propose({
        brief,
        orgUnitId: orgUnitId || undefined,
      });
      setProposal(p);
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setProposing(false);
    }
  };

  const runApply = async () => {
    if (!proposal || mungerBlocked) return;
    if (needsAgentApproval && !approvedAgent) return;
    if (!allNewSkillsApproved) return;

    setApplying(true);
    setError(null);
    try {
      await api.catalogStudio.agents.apply({
        proposal,
        approved: proposal.reuse ? false : approvedAgent,
        approvedNewSkillNames: [...approvedSkills],
        orgUnitId: orgUnitId || undefined,
      });
      setDone(true);
      onApplied?.();
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-3xl space-y-6"}>
      <Panel title={embedded ? undefined : t("catalogStudio.tabs.createAgent")} bodySize="sm">
        <div className="space-y-4">
          {embedded ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {t("catalogStudio.tabs.createAgent")}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              {t("catalogStudio.briefLabel")}
            </label>
            <textarea
              className="min-h-[96px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={t("catalogStudio.briefPlaceholderAgent")}
            />
          </div>
          {orgUnits.length > 0 && !embedded && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                {t("catalogStudio.orgUnitLabel")}
              </label>
              <select
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={orgUnitId}
                onChange={(e) => setOrgUnitId(e.target.value)}
              >
                <option value="">{t("catalogStudio.orgUnitAny")}</option>
                {orgUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {t("catalogStudio.orgUnitHint")}
              </p>
            </div>
          )}
          {embedded && initialOrgUnitId ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {t("catalogStudio.linkedToOrg")}
            </p>
          ) : null}
          <p className="text-xs text-[var(--color-muted-foreground)]">{t("catalogStudio.humanApprovalHint")}</p>
          <Button onClick={() => void runPropose()} disabled={proposing || brief.trim().length < 8}>
            {proposing ? t("catalogStudio.proposing") : t("catalogStudio.propose")}
          </Button>
        </div>
      </Panel>

      {error && (
        <p className="rounded-md border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      )}

      {proposal && (
        <>
          {proposal.reuse && (
            <Panel title={t("catalogStudio.reuseTitle")} bodySize="sm">
              <p className="text-sm font-medium">{proposal.reuse.existingAgentName}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{proposal.reuse.reason}</p>
            </Panel>
          )}

          {proposal.agent && (
            <Panel title={t("catalogStudio.newAgentTitle")} bodySize="sm">
              <p className="text-sm">
                <strong>{proposal.agent.name}</strong> — {proposal.agent.role}
              </p>
              <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-[var(--color-background)] p-3 text-xs whitespace-pre-wrap">
                {proposal.agent.systemPrompt}
              </pre>
              {proposal.existingSkillNames.length > 0 && (
                <p className="mt-3 text-sm">
                  {t("catalogStudio.existingSkills")}: {proposal.existingSkillNames.join(", ")}
                </p>
              )}
              {proposal.mcpGrants && proposal.mcpGrants.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">{t("catalogStudio.mcpGrantsTitle")}</p>
                  <ul className="space-y-2 text-sm">
                    {proposal.mcpGrants.map((grant) => (
                      <li
                        key={grant.serverId}
                        className="rounded-md border border-[var(--color-border)] p-3"
                      >
                        <p>
                          <strong>{grant.serverName}</strong> ({grant.serverSlug})
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                          {grant.reason}
                        </p>
                        <p className="mt-1 text-xs">
                          {grant.toolNames?.length
                            ? t("catalogStudio.mcpToolsSubset", {
                                tools: grant.toolNames.join(", "),
                              })
                            : t("catalogStudio.mcpToolsAll")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={approvedAgent}
                  onChange={(e) => setApprovedAgent(e.target.checked)}
                />
                {t("catalogStudio.approveAgent")}
              </label>
            </Panel>
          )}

          {proposal.newSkills.length > 0 && (
            <Panel title={t("catalogStudio.newSkillsTitle")} bodySize="sm">
              <ul className="space-y-3">
                {proposal.newSkills.map((skill) => (
                  <li key={skill.name} className="rounded-md border border-[var(--color-border)] p-3">
                    <p className="text-sm font-medium">{skill.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{skill.description}</p>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={approvedSkills.has(skill.name)}
                        onChange={(e) => toggleSkill(skill.name, e.target.checked)}
                      />
                      {t("catalogStudio.approveNewSkill", { name: skill.name })}
                    </label>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {proposal.mungerReview && <MungerReviewPanel review={proposal.mungerReview} />}

          {!done && (
            <Button
              onClick={() => void runApply()}
              disabled={
                applying ||
                mungerBlocked ||
                (needsAgentApproval && !approvedAgent) ||
                (proposal.newSkills.length > 0 && !allNewSkillsApproved)
              }
            >
              {applying ? t("catalogStudio.applying") : t("catalogStudio.apply")}
            </Button>
          )}

          {done && (
            <Panel bodySize="sm">
              <p className="text-sm">{t("catalogStudio.appliedAgent")}</p>
              {orgUnitId && (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {t("catalogStudio.linkedToOrg")}
                </p>
              )}
              <Button className="mt-3" variant="secondary" onClick={() => navigate("/ai-team?tab=agents")}>
                {t("catalogStudio.viewAgents")}
              </Button>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
