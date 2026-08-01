import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type PublicDeliveryPayload } from "../lib/api";
import RichMarkdownView from "../components/ui/RichMarkdownView";
import PageLoading from "../components/ui/PageLoading";

type PublicTab = "summary" | "documents";

export default function PublicDeliveryPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [payload, setPayload] = useState<PublicDeliveryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PublicTab>("summary");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.public
      .delivery(token)
      .then(setPayload)
      .catch(() => setPayload(null))
      .finally(() => setLoading(false));
  }, [token]);

  const selectedDoc = useMemo(() => {
    if (!payload?.documents.length) return null;
    return payload.documents.find((d) => d.id === selectedDocId) ?? payload.documents[0]!;
  }, [payload, selectedDocId]);

  useEffect(() => {
    if (payload?.finalReport) setTab("summary");
    else if (payload?.documents.length) setTab("documents");
  }, [payload?.finalReport, payload?.documents.length]);

  if (loading) {
    return <PageLoading message={t("office.encargos.delivery.publicLoading")} />;
  }

  if (!payload) {
    return (
      <div className="public-delivery-page">
        <p className="public-delivery-empty">{t("office.encargos.delivery.publicNotFound")}</p>
      </div>
    );
  }

  const blocked = payload.expired || payload.revoked;

  return (
    <div className="public-delivery-page">
      <header className="public-delivery-header">
        <p className="public-delivery-eyebrow">{t("office.encargos.delivery.publicEyebrow")}</p>
        <h1>{payload.encargo.title}</h1>
        {payload.label ? <p className="public-delivery-label">{payload.label}</p> : null}
        {payload.encargo.request ? <p className="public-delivery-request">{payload.encargo.request}</p> : null}
        <dl className="public-delivery-meta">
          <div>
            <dt>{t("office.encargos.procedure")}</dt>
            <dd>{payload.encargo.procedureLabel}</dd>
          </div>
          {payload.encargo.departmentName ? (
            <div>
              <dt>{t("office.encargos.department")}</dt>
              <dd>{payload.encargo.departmentName}</dd>
            </div>
          ) : null}
          {payload.encargo.productName ? (
            <div>
              <dt>{t("office.encargos.product")}</dt>
              <dd>{payload.encargo.productName}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {blocked ? (
        <div className="public-delivery-blocked" role="alert">
          {payload.revoked
            ? t("office.encargos.delivery.publicRevoked")
            : t("office.encargos.delivery.publicExpired")}
        </div>
      ) : (
        <>
          <nav className="public-delivery-tabs" aria-label={t("office.encargos.delivery.publicTabs")}>
            {payload.finalReport ? (
              <button
                type="button"
                className={tab === "summary" ? "is-active" : undefined}
                onClick={() => setTab("summary")}
              >
                {t("office.encargos.tabFinal")}
              </button>
            ) : null}
            {payload.documents.length > 0 ? (
              <button
                type="button"
                className={tab === "documents" ? "is-active" : undefined}
                onClick={() => setTab("documents")}
              >
                {t("office.encargos.tabDocuments", { count: payload.documents.length })}
              </button>
            ) : null}
          </nav>

          <div className="public-delivery-body">
            {tab === "summary" && payload.finalReport ? (
              <article className="public-delivery-markdown">
                <RichMarkdownView value={payload.finalReport} />
              </article>
            ) : null}

            {tab === "documents" && payload.documents.length > 0 ? (
              <div className="public-delivery-docs">
                <aside className="public-delivery-doc-list">
                  {payload.documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className={selectedDoc?.id === doc.id ? "is-active" : undefined}
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      {doc.title}
                    </button>
                  ))}
                </aside>
                <article className="public-delivery-markdown">
                  {selectedDoc ? <RichMarkdownView value={selectedDoc.markdown} /> : null}
                </article>
              </div>
            ) : null}

            {!payload.finalReport && payload.documents.length === 0 ? (
              <p className="public-delivery-empty">{t("office.encargos.delivery.publicEmpty")}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
