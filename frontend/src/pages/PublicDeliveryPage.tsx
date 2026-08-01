import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Printer } from "lucide-react";
import { api, type PublicDeliveryPayload } from "../lib/api";
import RichMarkdownView from "../components/ui/RichMarkdownView";
import PageLoading from "../components/ui/PageLoading";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

type PublicTab = "summary" | "documents";

const deliveryPinKey = (token: string) => `delivery-pin:${token}`;

function setMetaTag(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function PublicDeliveryPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [payload, setPayload] = useState<PublicDeliveryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [tab, setTab] = useState<PublicTab>("summary");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const loadDelivery = useCallback(async (pin?: string | null) => {
    if (!token) return;
    setLoading(true);
    setPinError(null);
    try {
      const data = await api.public.delivery(token, pin);
      setPayload(data);
    } catch {
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const stored = sessionStorage.getItem(deliveryPinKey(token));
    void loadDelivery(stored);
  }, [token, loadDelivery]);

  const submitPin = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !pinInput.trim()) return;
    setUnlocking(true);
    setPinError(null);
    try {
      const data = await api.public.unlockDelivery(token, pinInput.trim());
      sessionStorage.setItem(deliveryPinKey(token), pinInput.trim());
      setPayload(data);
    } catch {
      setPinError(t("office.encargos.delivery.pinInvalid"));
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    if (!payload) return;
    const title = `${payload.encargo.title} — ${payload.branding.tenantName}`;
    document.title = title;
    setMetaTag("robots", "noindex, nofollow");
    setMetaTag("description", payload.encargo.request || payload.encargo.procedureLabel);
    setMetaTag("og:title", title, true);
    setMetaTag("og:description", payload.encargo.procedureLabel, true);
    setMetaTag("og:type", "article", true);
    if (payload.branding.logoUrl) setMetaTag("og:image", payload.branding.logoUrl, true);
  }, [payload]);

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
  const locked = payload.locked && !blocked;
  const { branding } = payload;
  const tocItems = [
    ...(payload.finalReport ? [{ id: "summary", label: t("office.encargos.tabFinal") }] : []),
    ...payload.documents.map((doc) => ({ id: doc.id, label: doc.title })),
  ];

  return (
    <div
      className="public-delivery-page"
      style={{ ["--delivery-primary" as string]: branding.primaryColor }}
    >
      <header className="public-delivery-header public-delivery-header-branded">
        <div className="public-delivery-brand-row">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="public-delivery-logo" />
          ) : null}
          <p className="public-delivery-brand-name">{branding.tenantName}</p>
        </div>
        <p className="public-delivery-eyebrow">{t("office.encargos.delivery.publicEyebrow")}</p>
        <h1>{payload.encargo.title}</h1>
        {payload.label ? <p className="public-delivery-label">{payload.label}</p> : null}
        {payload.encargo.request ? <p className="public-delivery-request">{payload.encargo.request}</p> : null}
        <dl className="public-delivery-meta">
          <div>
            <dt>{t("office.encargos.procedure")}</dt>
            <dd>{payload.encargo.procedureLabel}</dd>
          </div>
          {payload.encargo.completedAt ? (
            <div>
              <dt>{t("office.encargos.delivery.deliveredAt")}</dt>
              <dd>{new Date(payload.encargo.completedAt).toLocaleDateString()}</dd>
            </div>
          ) : null}
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
          {branding.contactEmail ? (
            <div>
              <dt>{t("office.encargos.delivery.contact")}</dt>
              <dd>
                <a href={`mailto:${branding.contactEmail}`}>{branding.contactEmail}</a>
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      {branding.confidentialityNotice ? (
        <aside className="public-delivery-confidential" role="note">
          {branding.confidentialityNotice}
        </aside>
      ) : null}

      {blocked ? (
        <div className="public-delivery-blocked" role="alert">
          {payload.revoked
            ? t("office.encargos.delivery.publicRevoked")
            : t("office.encargos.delivery.publicExpired")}
        </div>
      ) : locked ? (
        <form className="public-delivery-pin-gate" onSubmit={submitPin}>
          <p className="public-delivery-pin-lead">{t("office.encargos.delivery.pinRequired")}</p>
          <Input
            label={t("office.encargos.delivery.pinLabel")}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder={t("office.encargos.delivery.pinPlaceholder")}
          />
          {pinError ? (
            <p className="public-delivery-pin-error" role="alert">
              {pinError}
            </p>
          ) : null}
          <Button type="submit" disabled={unlocking || pinInput.trim().length < 4}>
            {t("office.encargos.delivery.pinUnlock")}
          </Button>
        </form>
      ) : (
        <>
          <div className="public-delivery-toolbar">
            <a href={api.public.deliveryExportHtmlUrl(token!, true)} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary">
                <Printer className="h-4 w-4" aria-hidden />
                {t("office.encargos.delivery.printPdf")}
              </Button>
            </a>
            <a href={api.public.deliveryExportMdUrl(token!)} download>
              <Button size="sm" variant="ghost">
                <Download className="h-4 w-4" aria-hidden />
                {t("office.encargos.delivery.downloadMd")}
              </Button>
            </a>
          </div>

          {tocItems.length > 1 ? (
            <nav className="public-delivery-toc" aria-label={t("office.encargos.delivery.toc")}>
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "summary") setTab("summary");
                    else {
                      setTab("documents");
                      setSelectedDocId(item.id);
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          ) : null}

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

      {branding.footerText ? (
        <footer className="public-delivery-footer">{branding.footerText}</footer>
      ) : null}
    </div>
  );
}
