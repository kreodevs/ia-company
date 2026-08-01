import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Workflow } from "../../lib/api";
import type { WorkflowEnrichmentProposal } from "../../lib/catalog-studio-types";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import { translateApiError } from "../../lib/translate-error";
import Button from "../ui/Button";
import { Dialog } from "../molecules/Dialog";
import MungerReviewPanel from "../catalog-studio/MungerReviewPanel";
import WorkflowImpactPanel from "./WorkflowImpactPanel";

interface WorkflowAiEnrichModalProps {
  open: boolean;
  workflowId: string;
  workflowName: string;
  onClose: () => void;
  onEnriched?: (workflow: Workflow) => void;
}

export default function WorkflowAiEnrichModal({
  open,
  workflowId,
  workflowName,
  onClose,
  onEnriched,
}: WorkflowAiEnrichModalProps) {
  const { t } = useTranslation();
  const [brief, setBrief] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proposal, setProposal] = useState<WorkflowEnrichmentProposal | null>(null);
  const [approvedAgents, setApprovedAgents] = useState<Set<string>>(new Set());
  const [approvedSkills, setApprovedSkills] = useState<Set<string>>(new Set());
  const [allowRename, setAllowRename] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBrief("");
      setAnswers({});
      setProposal(null);
      setApprovedAgents(new Set());
      setApprovedSkills(new Set());
      setAllowRename(false);
      setError(null);
    }
  }, [open]);

  const mungerBlocked = Boolean(proposal?.mungerReview && !proposal.mungerReview.approved);
  const clarifying = Boolean(proposal?.needsClarification && proposal.questions?.length);
  const newAgents = proposal?.newAgents ?? [];
  const newSkills = proposal?.newSkills ?? [];
  const allAgentsApproved =
    newAgents.length === 0 || newAgents.every((agent) => approvedAgents.has(agent.name));
  const allSkillsApproved =
    newSkills.length === 0 || newSkills.every((skill) => approvedSkills.has(skill.name));
  const renaming = Boolean(
    proposal?.workflow?.name && proposal.workflow.name !== workflowName,
  );
  const highRisk = Boolean(
    proposal?.impact?.risks.some((risk) => risk.severity === "high"),
  );
  const renameBlocked = renaming && !allowRename;

  const runPropose = async (withAnswers = false) => {
    setProposing(true);
    setError(null);
    try {
      const p = await api.catalogStudio.workflows.enrichPropose({
        workflowId,
        brief,
        answers: withAnswers ? answers : undefined,
      });
      setProposal(p);
      if (!p.needsClarification) {
        setApprovedAgents(new Set((p.newAgents ?? []).map((agent) => agent.name)));
        setApprovedSkills(new Set((p.newSkills ?? []).map((skill) => skill.name)));
      }
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setProposing(false);
    }
  };

  const runApply = async () => {
    if (!proposal?.workflow || mungerBlocked || !allAgentsApproved || !allSkillsApproved || renameBlocked) {
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const result = await api.catalogStudio.workflows.enrichApply({
        workflowId,
        proposal,
        approved: true,
        approvedNewAgentNames: [...approvedAgents],
        approvedNewSkillNames: [...approvedSkills],
        allowRename: renaming ? allowRename : undefined,
      });
      if (result.workflow) {
        onEnriched?.(result.workflow);
      }
      onClose();
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setApplying(false);
    }
  };

  const toggleAgent = (name: string, checked: boolean) => {
    setApprovedAgents((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const toggleSkill = (name: string, checked: boolean) => {
    setApprovedSkills((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  return (
    <Dialog
      visible={open}
      onHide={onClose}
      size="full"
      title={t("workflows.ai.enrichTitle")}
      description={t("workflows.ai.enrichSubtitle")}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          {clarifying ? (
            <Button
              disabled={proposing || Object.values(answers).every((value) => !value.trim())}
              onClick={() => void runPropose(true)}
            >
              {proposing ? t("workflows.ai.proposing") : t("workflows.ai.submitAnswers")}
            </Button>
          ) : proposal?.workflow ? (
            <Button
              disabled={
                applying || mungerBlocked || !allAgentsApproved || !allSkillsApproved || renameBlocked
              }
              onClick={() => void runApply()}
            >
              {applying ? t("workflows.ai.enrichApplying") : t("workflows.ai.enrichApply")}
            </Button>
          ) : (
            <Button disabled={proposing || brief.trim().length < 12} onClick={() => void runPropose(false)}>
              {proposing ? t("workflows.ai.proposing") : t("workflows.ai.propose")}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 px-1 pb-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
            {t("workflows.ai.briefLabel")} — {formatWorkflowTitle(workflowName)}
          </label>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder={t("workflows.ai.enrichBriefPlaceholder")}
            disabled={Boolean(proposal?.workflow)}
          />
        </div>

        {clarifying && proposal?.questions ? (
          <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t("workflows.ai.clarifyTitle")}
            </p>
            {proposal.questions.map((question) => (
              <div key={question}>
                <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                  {question}
                </label>
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={answers[question] ?? ""}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [question]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        ) : null}

        {proposal?.impact ? (
          <WorkflowImpactPanel
            impact={proposal.impact}
            currentName={workflowName}
            proposedName={proposal.workflow?.name}
          />
        ) : null}

        {proposal?.workflow ? (
          <div className="space-y-4">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="text-lg font-semibold">
                {formatWorkflowTitle(proposal.workflow.name)}
              </h3>
              {proposal.previousStepCount != null ? (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {proposal.previousStepCount} → {proposal.workflow.steps.length}{" "}
                  {t("workflows.ai.enrichSteps")}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-relaxed">{proposal.workflow.description}</p>
              <ol className="mt-4 space-y-2">
                {proposal.workflow.steps.map((step, index) => (
                  <li
                    key={`${step.agentName}-${index}`}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-semibold text-[var(--color-primary)]">
                      {index + 1}
                    </span>
                    <span className="font-medium">{step.agentName}</span>
                    {step.label ? (
                      <span className="text-[var(--color-muted-foreground)]">— {step.label}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>

            {renaming ? (
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-300 bg-amber-50/80 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={allowRename}
                  onChange={(event) => setAllowRename(event.target.checked)}
                />
                <span>{t("workflows.ai.allowRename")}</span>
              </label>
            ) : null}

            {highRisk && !renaming ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {t("workflows.ai.enrichHighRiskHint")}
              </p>
            ) : null}

            {proposal.gaps?.notes || proposal.gaps?.missingAgents?.length ? (
              <div className="rounded-md border border-[var(--color-border)] p-3 text-sm">
                <p className="font-medium">{t("workflows.ai.gapsTitle")}</p>
                {proposal.gaps.notes ? (
                  <p className="mt-1 text-[var(--color-muted-foreground)]">{proposal.gaps.notes}</p>
                ) : null}
              </div>
            ) : null}

            {newAgents.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("workflows.ai.newAgentsTitle")}</p>
                {newAgents.map((agent) => (
                  <label
                    key={agent.name}
                    className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--color-border)] p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={approvedAgents.has(agent.name)}
                      onChange={(event) => toggleAgent(agent.name, event.target.checked)}
                    />
                    <span>
                      <strong>{agent.name}</strong> — {agent.role}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            {newSkills.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("workflows.ai.newSkillsTitle")}</p>
                {newSkills.map((skill) => (
                  <label
                    key={skill.name}
                    className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--color-border)] p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={approvedSkills.has(skill.name)}
                      onChange={(event) => toggleSkill(skill.name, event.target.checked)}
                    />
                    <span>
                      <strong>{skill.name}</strong> — {skill.description}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            {proposal.mungerReview ? (
              <MungerReviewPanel review={proposal.mungerReview} />
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Dialog>
  );
}
