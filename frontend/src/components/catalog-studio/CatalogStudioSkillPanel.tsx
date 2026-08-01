import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { SkillStudioProposal } from "../../lib/catalog-studio-types";
import { translateApiError } from "../../lib/translate-error";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import MungerReviewPanel from "./MungerReviewPanel";

interface CatalogStudioSkillPanelProps {
  onApplied?: () => void;
}

export default function CatalogStudioSkillPanel({ onApplied }: CatalogStudioSkillPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [brief, setBrief] = useState("");
  const [proposal, setProposal] = useState<SkillStudioProposal | null>(null);
  const [approved, setApproved] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mungerBlocked = Boolean(proposal?.mungerReview && !proposal.mungerReview.approved);
  const needsApproval = Boolean(proposal && !proposal.reuse && proposal.skill);

  const runPropose = async () => {
    setProposing(true);
    setError(null);
    setDone(false);
    setApproved(false);
    try {
      const p = await api.catalogStudio.skills.propose({ brief });
      setProposal(p);
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setProposing(false);
    }
  };

  const runApply = async () => {
    if (!proposal || mungerBlocked) return;
    if (needsApproval && !approved) return;
    setApplying(true);
    setError(null);
    try {
      await api.catalogStudio.skills.apply({
        proposal,
        approved: proposal.reuse ? false : approved,
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Panel title={t("catalogStudio.tabs.createSkill")} bodySize="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              {t("catalogStudio.briefLabel")}
            </label>
            <textarea
              className="min-h-[96px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={t("catalogStudio.briefPlaceholderSkill")}
            />
          </div>
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
              <p className="text-sm font-medium">{proposal.reuse.existingSkillName}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{proposal.reuse.reason}</p>
            </Panel>
          )}

          {proposal.skill && (
            <Panel title={t("catalogStudio.newSkillTitle")} bodySize="sm">
              <p className="text-sm">
                <strong>{proposal.skill.name}</strong> — {proposal.skill.description}
              </p>
              <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-[var(--color-background)] p-3 text-xs whitespace-pre-wrap">
                {proposal.skill.promptContent}
              </pre>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
                {t("catalogStudio.approveSkill")}
              </label>
            </Panel>
          )}

          {proposal.mungerReview && <MungerReviewPanel review={proposal.mungerReview} />}

          {!done && (
            <Button
              onClick={() => void runApply()}
              disabled={applying || mungerBlocked || (needsApproval && !approved)}
            >
              {applying ? t("catalogStudio.applying") : t("catalogStudio.apply")}
            </Button>
          )}

          {done && (
            <Panel bodySize="sm">
              <p className="text-sm">{t("catalogStudio.appliedSkill")}</p>
              <Button className="mt-3" variant="secondary" onClick={() => navigate("/settings/specialists")}>
                {t("catalogStudio.viewSkills")}
              </Button>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
