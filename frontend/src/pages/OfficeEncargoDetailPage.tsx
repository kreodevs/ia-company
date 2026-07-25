import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Bug, Check, Crosshair, FileText, Sparkles, X } from "lucide-react";
import {
  api,
  type OfficeEncargoDetail,
  type OfficeEncargoDocument,
  type OfficeEncargoDecisionProposal,
} from "../lib/api";
import RichMarkdownView from "../components/ui/RichMarkdownView";
import PageLoading from "../components/ui/PageLoading";
import StatusBadge from "../components/ui/StatusBadge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import StatusPill from "../components/ui/StatusPill";

type DetailTab = "final" | "documents";

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
  const { t } = useTranslation();
  const [detail, setDetail] = useState<OfficeEncargoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("final");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [pivotOpen, setPivotOpen] = useState(false);
  const [pivotText, setPivotText] = useState("");

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

  useEffect(() => {
    if (detail?.finalReport) setTab("final");
    else if (detail?.documents.length) setTab("documents");
  }, [detail?.id, detail?.finalReport, detail?.documents.length]);

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
    } finally {
      setDecisionBusy(false);
    }
  };

  const submitPivot = async () => {
    if (!decision || !pivotText.trim()) return;
    await runDecision(() => api.decisions.pivot(decision.id, { pivot: pivotText.trim() }));
    setPivotOpen(false);
    setPivotText("");
  };

  if (loading) {
    return <PageLoading message={t("office.encargos.loadingDetail")} />;
  }

  if (!detail) {
    return (
      <div className="office-page">
        <p className="office-empty">{t("office.encargos.notFound")}</p>
        <Link to="/office/encargos" className="office-link-btn mt-4 inline-flex">
          {t("office.encargos.backToList")}
        </Link>
      </div>
    );
  }

  const showFinal = tab === "final";
  const markdown = showFinal ? detail.finalReport : (selectedDoc?.markdown ?? "");
  const showDocSidebar = tab === "documents" && documents.length > 0;

  return (
    <div className="office-page office-encargo-detail">
      <header className="office-header">
        <div>
          <p className="office-eyebrow">{t("office.encargos.detailEyebrow")}</p>
          <h1 className="office-title">{detail.title}</h1>
          {detail.request ? <p className="office-subtitle">{detail.request}</p> : null}
        </div>
        <div className="office-encargo-detail-actions">
          <span className="office-encargo-phase" data-phase={detail.phase}>
            {t(`office.encargos.phase.${detail.phase}`)}
          </span>
          <StatusBadge
            status={detail.status}
            label={t(`status.${detail.status}`, { defaultValue: detail.status })}
          />
        </div>
      </header>

      <div className="office-encargo-detail-toolbar">
        <Link to="/office/encargos" className="office-link-btn">
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

      <dl className="office-encargo-detail-meta">
        <div>
          <dt>{t("office.encargos.workflow")}</dt>
          <dd>{detail.workflowName}</dd>
        </div>
        {detail.productName ? (
          <div>
            <dt>{t("office.encargos.product")}</dt>
            <dd>{detail.productName}</dd>
          </div>
        ) : (
          <div>
            <dt>{t("office.encargos.product")}</dt>
            <dd>{t("office.encargos.scopeCompany")}</dd>
          </div>
        )}
        {detail.teamAgents.length > 0 ? (
          <div>
            <dt>{t("office.encargos.team")}</dt>
            <dd>{detail.teamAgents.map((a) => a.replace(/-/g, " ")).join(", ")}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t("office.encargos.cost")}</dt>
          <dd>${detail.totalCostUsd.toFixed(2)}</dd>
        </div>
      </dl>

      {showNextPanel ? (
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

          {decision ? (
            <div className="office-encargo-decision">
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
                        void runDecision(() => api.decisions.approve(decision.id))
                      }
                    >
                      <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                      {t("decisions.approve", {
                        decision:
                          decision.recommended === "go" ? t("decisions.go") : t("decisions.noGo"),
                      })}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={decisionBusy}
                      onClick={() => {
                        setPivotOpen(true);
                        setPivotText(decision.pivotPrompt ?? "");
                      }}
                    >
                      {t("decisions.pivot")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={decisionBusy}
                      onClick={() =>
                        void runDecision(() => api.decisions.reject(decision.id))
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
            </div>
          ) : detail.phase === "delivered" && detail.workflowName === "new-product-evaluation" ? (
            <p className="office-encargo-next-hint">{t("office.encargos.noDecisionHint")}</p>
          ) : null}

          <Link to="/decisions" className="office-link-btn office-encargo-decisions-link">
            <ArrowRight className="h-4 w-4" aria-hidden />
            {t("office.encargos.openDecisions")}
          </Link>
        </section>
      ) : null}

      <div className="office-encargo-detail-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "final"}
          className={`office-encargos-filter ${tab === "final" ? "office-encargos-filter-active" : ""}`}
          onClick={() => setTab("final")}
        >
          <FileText className="h-4 w-4" aria-hidden />
          {t("office.encargos.tabFinal")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "documents"}
          className={`office-encargos-filter ${tab === "documents" ? "office-encargos-filter-active" : ""}`}
          onClick={() => setTab("documents")}
        >
          {t("office.encargos.tabDocuments", { count: documents.length })}
        </button>
      </div>

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
    </div>
  );
}
