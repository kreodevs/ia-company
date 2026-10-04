import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bug,
  Check,
  Crosshair,
  FileText,
  MessageSquare,
  Sparkles,
  X,
  Clock,
  DollarSign,
  CheckCheck,
} from "lucide-react";
import {
  api,
  type OfficeEncargoDetail,
  type OfficeEncargoDocument,
  type OfficeEncargoDecisionProposal,
} from "../lib/api";
import RichMarkdownView from "../components/ui/RichMarkdownView";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import PageHeader from "../components/ui/PageHeader";
import StatusBadge from "../components/ui/StatusBadge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Textarea } from "../components/atoms/Textarea";
import StatusPill from "../components/ui/StatusPill";
import DecisionEvidencePanel from "../components/decisions/DecisionEvidencePanel";
import EncargoDeliveryPanel from "../components/office/EncargoDeliveryPanel";
import EncargoRevenuePanel from "../components/office/EncargoRevenuePanel";
import OfficeEncargoLivePanel from "../components/office/OfficeEncargoLivePanel";
import DepartmentWorkMapPanel from "../components/office/DepartmentWorkMapPanel";
import RunScopeBadge from "../components/runs/RunScopeBadge";
import EncargoActivityTimeline from "../components/office/EncargoActivityTimeline";
import DocumentReviewPanel from "../components/office/DocumentReviewPanel";
import EncargoStatusRail, {
  EncargoBlockersPanel,
  EncargoParticipantsPanel,
} from "../components/office/EncargoStatusRail";
import { useDecisionActorEmail } from "../hooks/useDecisionActorEmail";
import { notifyPendingDecisionsChanged } from "../hooks/usePendingDecisionsCount";
import {
  encargoDepartmentLabel,
  encargoTeamLabels,
} from "../lib/office-encargo-display";

type DetailTab =
  | "summary"
  | "work"
  | "conversation"
  | "documents"
  | "activity"
  | "cost"
  | "delivery";

function decisionStatusPill(status: OfficeEncargoDecisionProposal["status"]): string {
  switch (status) {
    case "approved":
      return "completed";
    case "rejected":
    case "cancelled":
      return "cancelled";
    case "drilling":
      return "running";
    default:
      return "pending";
  }
}

export default function OfficeEncargoDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const actorEmail = useDecisionActorEmail();
  const [detail, setDetail] = useState<OfficeEncargoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("summary");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [pivotOpen, setPivotOpen] = useState(false);
  const [pivotText, setPivotText] = useState("");
  const [revisionFeedback, setRevisionFeedback] = useState("");

  const refresh = useCallback(async () => {
    if (!runId) return;
    const data = await api.office.encargo(runId);
    setDetail(data);
  }, [runId]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!detail || (detail.phase !== "in_progress" && detail.phase !== "queued")) return;
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [detail, refresh]);

  const documents = detail?.documents ?? [];
  const selectedDoc = useMemo(() => {
    if (documents.length === 0) return null;
    return documents.find((d) => d.id === selectedDocId) ?? documents[documents.length - 1]!;
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (selectedDoc && !selectedDocId) setSelectedDocId(selectedDoc.id);
  }, [selectedDoc, selectedDocId]);

  const decision = detail?.decisionProposal ?? null;
  const decisionPending =
    decision?.status === "pending_review" || decision?.status === "drilling";
  const showNextPanel = Boolean(
    detail?.nextAction ||
      decision ||
      (detail?.phase === "delivered" && detail.workflowName === "new-product-evaluation"),
  );

  const runDecision = async (fn: () => Promise<unknown>) => {
    setDecisionBusy(true);
    try {
      await fn();
      await refresh();
      notifyPendingDecisionsChanged();
    } finally {
      setDecisionBusy(false);
    }
  };

  const submitPivot = async () => {
    if (!decision || !pivotText.trim()) return;
    await runDecision(() =>
      api.decisions.pivot(decision.id, { pivot: pivotText.trim(), actorEmail }),
    );
    setPivotOpen(false);
    setPivotText("");
  };

  const submitRevision = () => {
    if (!runId || !revisionFeedback.trim()) return;
    const params = new URLSearchParams({ parentRunId: runId });
    if (detail?.productId) params.set("productId", detail.productId);
    navigate(`/office?${params.toString()}`, {
      state: {
        revisionFeedback: revisionFeedback.trim(),
        encargoTitle: detail?.title,
      },
    });
  };

  if (loading) {
    return <PageLoading message={t("office.encargos.loadingDetail")} />;
  }

  if (!detail) {
    return (
      <div className="office-page mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow={
            <Breadcrumbs
              items={[
                { label: t("office.encargos.breadcrumbOffice"), to: "/office" },
                { label: t("office.encargos.backToList"), to: "/office/trabajo" },
              ]}
            />
          }
          title={t("office.encargos.notFound")}
        />
        <EmptyState
          title={t("office.encargos.notFound")}
          description={t("office.encargos.backToList")}
          action={
            <Link to="/office/trabajo" className="office-link-btn inline-flex">
              {t("office.encargos.backToList")}
            </Link>
          }
        />
      </div>
    );
  }

  const showFinal = tab === "documents" && selectedDoc?.kind !== "file" && detail.finalReport;
  const markdown = showFinal ? detail.finalReport : selectedDoc?.markdown ?? "";
  const showDocSidebar = tab === "documents" && documents.length > 0;


  const Tabs: Array<{ id: DetailTab; label: string; icon: React.ReactNode }> = [
    { id: "summary", label: t("office.encargos.tabSummary"), icon: <FileText className="h-4 w-4" aria-hidden /> },
    { id: "work", label: t("office.encargos.tabWork"), icon: <MessageSquare className="h-4 w-4" aria-hidden /> },
    { id: "conversation", label: t("office.encargos.tabConversation"), icon: <Sparkles className="h-4 w-4" aria-hidden /> },
    { id: "documents", label: t("office.encargos.tabDocuments", { count: documents.length }), icon: <FileText className="h-4 w-4" aria-hidden /> },
    { id: "activity", label: t("office.encargos.tabActivity"), icon: <Clock className="h-4 w-4" aria-hidden /> },
    { id: "cost", label: t("office.encargos.tabCost"), icon: <DollarSign className="h-4 w-4" aria-hidden /> },
    { id: "delivery", label: t("office.encargos.tabDelivery"), icon: <CheckCheck className="h-4 w-4" aria-hidden /> },
  ];

  return (
    <div className="office-page office-encargo-detail">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("office.encargos.breadcrumbOffice"), to: "/office" },
              {
                label: detail.departmentHref
                  ? encargoDepartmentLabel(detail, t)
                  : encargoDepartmentLabel(detail, t),
                to: detail.departmentHref ?? undefined,
              },
              { label: detail.procedureLabel },
            ]}
          />
        }
        title={detail.title}
        subtitle={detail.request ?? undefined}
        meta={
          <>
            {detail.scopeLabelKey && detail.scopeLevel ? (
              <RunScopeBadge scope={{ level: detail.scopeLevel, labelKey: detail.scopeLabelKey }} />
            ) : null}
            <span className="office-encargo-phase" data-phase={detail.phase}>
              {t(`office.encargos.phase.${detail.phase}`)}
            </span>
            <StatusBadge
              status={detail.status}
              label={t(`status.${detail.status}`, { defaultValue: detail.status })}
            />
          </>
        }
      />

      <div className="office-encargo-detail-toolbar">
        <Link to="/office/trabajo" className="office-link-btn">
          {t("office.encargos.backToList")}
        </Link>
        {detail.warRoomHref ? (
          <Link to={detail.warRoomHref} className="office-link-btn">
            <Crosshair className="h-4 w-4" aria-hidden />
            {t("office.encargos.openWarRoom")}
          </Link>
        ) : null}
        <Link to={detail.debugHref} className="office-link-btn office-link-btn-muted">
          <Bug className="h-4 w-4" aria-hidden />
          {t("office.encargos.openDebug")}
        </Link>
      </div>

      <div className="office-encargo-detail-tabs" role="tablist" aria-label={t("office.encargos.tabsLabel")}>
        {Tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`office-encargos-filter ${tab === t.id ? "office-encargos-filter-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="office-encargo-detail-layout">
        <main className="office-encargo-preview">
          {tab === "summary" && (
            <>
              <section className="office-panel office-encargo-header">
                <div className="office-encargo-header-main">
                  <div className="office-encargo-header-meta">
                    <div>
                      <dt>{t("office.encargos.procedure")}</dt>
                      <dd>{detail.procedureLabel}</dd>
                    </div>
                    <div>
                      <dt>{t("office.encargos.product")}</dt>
                      <dd>
                        {detail.productName ?? (
                          <span className="office-meta-none">{t("office.encargos.scopeCompany")}</span>
                        )}
                      </dd>
                    </div>
                    {detail.teamAgents.length > 0 ? (
                      <div>
                        <dt>{t("office.encargos.team")}</dt>
                        <dd>{encargoTeamLabels(detail.teamAgents, t)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>{t("office.encargos.cost")}</dt>
                      <dd>${detail.totalCostUsd.toFixed(2)}</dd>
                    </div>
                    {detail.companyGoalName ? (
                      <div>
                        <dt>Objetivo</dt>
                        <dd>
                          <Link to="/office/objectives" className="text-[var(--primary)] hover:underline">
                            {detail.companyGoalName}
                          </Link>
                        </dd>
                      </div>
                    ) : null}
                    {detail.initiativeName ? (
                      <div>
                        <dt>Iniciativa</dt>
                        <dd>
                          <Link to="/office/iniciativas" className="text-[var(--primary)] hover:underline">
                            {detail.initiativeName}
                          </Link>
                        </dd>
                      </div>
                    ) : null}
                  </div>
                  <div className="office-encargo-header-next">
                    {detail.nextAction ? (
                      <div className="office-encargo-next-action">
                        <p className="office-encargo-next-label">{t("office.encargos.nextActionLabel")}</p>
                        <p className="office-encargo-next-text">{detail.nextAction}</p>
                      </div>
                    ) : null}
                    {detail.phase === "delivered" ? (
                      <p className="office-encargo-delivered-note">{t("office.encargos.deliveredNote")}</p>
                    ) : null}
                    {detail.phase === "in_progress" || detail.phase === "queued" ? (
                      <p className="office-encargo-progress-note">{t("office.encargos.inProgressNote")}</p>
                    ) : null}
                  </div>
                </div>
              </section>

              {decision ? (
                <section className="office-panel office-encargo-decision">
                  <h2 className="office-panel-title">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    {t("office.encargos.decisionTitle")}
                  </h2>
                  <div className="office-encargo-decision-head">
                    <StatusPill status={decisionStatusPill(decision.status)}>
                      {t(`decisions.status.${decision.status}`, { defaultValue: decision.status })}
                    </StatusPill>
                    <span className="office-encargo-decision-idea">{decision.ideaTitle}</span>
                    <span className="office-encargo-decision-rec">
                      {t("office.encargos.recommended", {
                        decision:
                          decision.recommended === "go" ? t("decisions.go") : t("decisions.noGo"),
                      })}
                    </span>
                  </div>
                  <p className="office-encargo-decision-rationale">{decision.rationale}</p>

                  {decision.evidence.length > 0 ? (
                    <DecisionEvidencePanel
                      proposalId={decision.id}
                      runId={runId!}
                      evidence={decision.evidence}
                      documents={detail.documents}
                    />
                  ) : null}

                  {decisionPending ? (
                    pivotOpen ? (
                      <div className="office-encargo-decision-pivot">
                        <Input
                          label={t("decisions.pivotPrompt")}
                          value={pivotText}
                          onChange={(e) => setPivotText(e.target.value)}
                          placeholder={t("decisions.pivotPlaceholder")}
                        />
                        <div className="office-encargo-decision-actions">
                          <Button
                            size="sm"
                            disabled={decisionBusy || !pivotText.trim()}
                            onClick={() => void submitPivot()}
                          >
                            {t("decisions.requestDrilldown")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPivotOpen(false);
                              setPivotText("");
                            }}
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="office-encargo-decision-actions">
                        <Button
                          size="sm"
                          disabled={decisionBusy}
                          onClick={() =>
                            void runDecision(() =>
                              api.decisions.approve(decision.id, { actorEmail }),
                            )
                          }
                        >
                          <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                          {t("decisions.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={decisionBusy}
                          onClick={() => {
                            setPivotOpen(true);
                            setPivotText(decision.pivotPrompt ?? "");
                          }}
                        >
                          {t("decisions.pivot")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={decisionBusy}
                          onClick={() =>
                            void runDecision(() =>
                              api.decisions.reject(decision.id, { actorEmail }),
                            )
                          }
                        >
                          <X className="mr-1 h-3.5 w-3.5" aria-hidden />
                          {t("decisions.reject")}
                        </Button>
                      </div>
                    )
                  ) : (
                    <p className="office-encargo-decision-resolved">
                      {t("office.encargos.decisionResolved")}
                    </p>
                  )}
                </section>
              ) : null}

              {showNextPanel && !decision ? (
                <section className="office-panel office-encargo-next-panel">
                  <h2 className="office-panel-title">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    {t("office.encargos.nextStepTitle")}
                  </h2>
                  {detail.nextAction ? (
                    <div className="office-encargo-next-action">
                      <p className="office-encargo-next-label">{t("office.encargos.nextActionLabel")}</p>
                      <p className="office-encargo-next-text">{detail.nextAction}</p>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <EncargoBlockersPanel detail={detail} />
              <EncargoParticipantsPanel detail={detail} />
            </>
          )}

          {tab === "work" && <DepartmentWorkMapPanel runId={detail.id} />}

          {tab === "conversation" && (
            <OfficeEncargoLivePanel
              runId={detail.id}
              title={detail.title}
              phase={detail.phase}
              departmentSlug={detail.departmentSlug}
              orgUnitId={detail.orgUnitId}
              productId={detail.productId}
              productName={detail.productName}
              warRoomHref={detail.warRoomHref}
              teamAgents={detail.teamAgents}
            />
          )}

          {tab === "documents" && (
            <>
              <DocumentReviewPanel
                runId={detail.id}
                document={selectedDoc}
                versionSha={selectedDoc?.verifiedCommitSha ?? null}
              />
              <div
                className={`office-encargo-detail-layout ${showDocSidebar ? "" : "office-encargo-detail-layout--full"}`}
              >
                {showDocSidebar ? (
                  <aside className="office-panel office-encargo-doc-list">
                    <h2 className="office-panel-title">{t("office.encargos.documentsTitle")}</h2>
                    <ul>
                      {documents.map((doc: OfficeEncargoDocument) => (
                        <li key={doc.id}>
                          <button
                            type="button"
                            className={`office-encargo-doc-item ${selectedDoc?.id === doc.id ? "office-encargo-doc-item-active" : ""}`}
                            onClick={() => setSelectedDocId(doc.id)}
                            title={[doc.agentName.replace(/-/g, " "), doc.title].join(" — ")}
                          >
                            <span className="office-encargo-doc-agent">{doc.agentName.replace(/-/g, " ")}</span>
                            <span className="office-encargo-doc-title">{doc.title}</span>
                            <span className="office-encargo-doc-kind">{t(`office.encargos.docKind.${doc.kind}`)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </aside>
                ) : null}

                <section className="office-panel office-encargo-preview">
                  <h2 className="office-panel-title">
                    {showFinal ? t("office.encargos.finalReportTitle") : selectedDoc?.title}
                  </h2>
                  {!showFinal && selectedDoc?.path ? (
                    <p className="office-encargo-doc-path">{selectedDoc.path}</p>
                  ) : null}
                  {!showFinal && selectedDoc?.kind === "file" ? (
                    <p className="office-encargo-summary-note office-encargo-summary-note-muted">
                      {t("office.encargos.fullReportNote")}
                    </p>
                  ) : null}
                  {showFinal && detail.finalReportKind === "summary" ? (
                    <p className="office-encargo-summary-note">{t("office.encargos.finalReportSubtitle")}</p>
                  ) : null}
                  {showFinal && detail.finalReportKind === "agent" ? (
                    <p className="office-encargo-summary-note office-encargo-summary-note-muted">
                      {t("office.encargos.finalReportFallbackNote")}
                    </p>
                  ) : null}
                  {detail.phase === "in_progress" || detail.phase === "queued" ? (
                    <p className="office-encargo-progress-note">{t("office.encargos.inProgressNote")}</p>
                  ) : null}
                  <RichMarkdownView
                    value={markdown}
                    emptyMessage={
                      showFinal ? t("office.encargos.finalReportEmpty") : t("office.encargos.documentEmpty")
                    }
                    ariaLabel={showFinal ? t("office.encargos.finalReportTitle") : selectedDoc?.title}
                  />
                </section>
              </div>
            </>
          )}

          {tab === "activity" && <EncargoActivityTimeline runId={detail.id} />}

          {tab === "cost" && (
            <>
              {detail.phase === "delivered" && detail.productId ? (
                <EncargoRevenuePanel
                  runId={detail.id}
                  productId={detail.productId}
                  productName={detail.productName}
                  linkedRevenueUsd={detail.linkedRevenueUsd}
                  linkedRevenueAt={detail.linkedRevenueAt}
                  onRecorded={() => void refresh()}
                />
              ) : (
                <p className="office-empty">{t("office.encargos.costNotAvailable")}</p>
              )}
            </>
          )}

          {tab === "delivery" && (
            <>
              <EncargoDeliveryPanel
                runId={detail.id}
                documents={documents}
                hasFinalReport={Boolean(detail.finalReport)}
                enabled={detail.phase === "delivered"}
                wizard={detail.phase === "delivered"}
              />
              {detail.phase === "delivered" ? (
                <section className="office-panel office-encargo-post-delivery">
                  <h2 className="office-panel-title">{t("office.encargos.postDelivery.title")}</h2>
                  <p className="office-panel-subtitle">{t("office.encargos.postDelivery.subtitle")}</p>
                  <div className="office-encargo-post-delivery-actions">
                    <a href="#encargo-delivery" className="office-link-btn">
                      {t("office.encargos.postDelivery.shareCta")}
                    </a>
                    <Link
                      to={
                        detail.productSlug
                          ? `/office/archive?product=${encodeURIComponent(detail.productSlug)}`
                          : "/office/archive"
                      }
                      className="office-link-btn"
                    >
                      {t("office.encargos.postDelivery.archiveLink")}
                    </Link>
                  </div>
                </section>
              ) : (
                <p className="office-empty">{t("office.encargos.deliveryNotAvailable")}</p>
              )}
            </>
          )}
        </main>

        <aside className="office-encargo-status-rail">
          <EncargoStatusRail detail={detail} />
        </aside>
      </div>

      {detail.phase === "delivered" || detail.phase === "failed" ? (
        <section className="office-panel office-encargo-revision-panel">
          <h2 className="office-panel-title">
            <MessageSquare className="h-4 w-4" aria-hidden />
            {t("office.revision.title")}
          </h2>
          <p className="office-panel-subtitle">{t("office.revision.subtitle")}</p>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {t("office.revision.feedbackLabel")}
            </span>
            <Textarea
              value={revisionFeedback}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setRevisionFeedback(e.target.value)
              }
              placeholder={t("office.revision.feedbackPlaceholder")}
              rows={5}
            />
          </label>
          <div className="office-encargo-revision-actions">
            <Button disabled={!revisionFeedback.trim()} onClick={submitRevision}>
              {t("office.revision.submit")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}