import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type OfficeEncargoDetail, type OfficeEncargoDocument } from "../../../lib/api";
import RichMarkdownView from "../../ui/RichMarkdownView";
import PageLoading from "../../ui/PageLoading";
import TabsBar from "../../ui/TabsBar";
import EncargoDeliveryPanel from "../../office/EncargoDeliveryPanel";

type ResultTab = "final" | "documents";

export default function EncargoResultPanel({
  runId,
  enabled,
}: {
  runId: string;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<OfficeEncargoDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<ResultTab>("final");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    api.office
      .encargo(runId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [enabled, runId]);

  const documents = detail?.documents ?? [];
  const selectedDoc = useMemo(() => {
    if (documents.length === 0) return null;
    return documents.find((d) => d.id === selectedDocId) ?? documents[documents.length - 1]!;
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (selectedDoc && !selectedDocId) setSelectedDocId(selectedDoc.id);
  }, [selectedDoc, selectedDocId]);

  useEffect(() => {
    if (!detail) return;
    if (detail.finalReport) setTab("final");
    else if (detail.documents.length) setTab("documents");
  }, [detail?.id, detail?.finalReport, detail?.documents.length]);

  if (!enabled) return null;

  if (loading) {
    return <PageLoading message={t("office.encargos.loadingDetail")} />;
  }

  if (!detail) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">{t("productDeliveries.loadFailed")}</p>
    );
  }

  const showFinal = tab === "final";
  const markdown = showFinal ? detail.finalReport : (selectedDoc?.markdown ?? "");
  const showDocSidebar = tab === "documents" && documents.length > 0;

  return (
    <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
      <TabsBar
        activeId={tab}
        onChange={(id) => setTab(id as ResultTab)}
        tabs={[
          { id: "final", label: t("productDeliveries.card.finalReport") },
          {
            id: "documents",
            label: t("productDeliveries.card.documentsTab"),
            badge:
              documents.length > 0 ? (
                <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-semibold">
                  {documents.length}
                </span>
              ) : null,
          },
        ]}
      />

      <div className={showDocSidebar ? "grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]" : ""}>
        {showDocSidebar ? (
          <ul className="space-y-1">
            {documents.map((doc: OfficeEncargoDocument) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                    selectedDoc?.id === doc.id
                      ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/30"
                  }`}
                >
                  <span className="block font-medium">{doc.agentName}</span>
                  <span className="text-[var(--color-muted-foreground)]">{doc.title}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          {markdown ? (
            <RichMarkdownView
              value={markdown}
              emptyMessage={t("productDeliveries.card.noFinalReport")}
            />
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {t("productDeliveries.card.noFinalReport")}
            </p>
          )}
        </div>
      </div>

      {detail.phase === "delivered" ? (
        <EncargoDeliveryPanel
          runId={detail.id}
          documents={documents}
          hasFinalReport={Boolean(detail.finalReport)}
          enabled
        />
      ) : null}
    </div>
  );
}
