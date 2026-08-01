import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type OfficeArchiveItem, type OfficeArchiveResponse } from "../lib/api";
import RichMarkdownView from "../components/ui/RichMarkdownView";
import PageLoading from "../components/ui/PageLoading";
import Input from "../components/ui/Input";
import { agentRoleLabelKey } from "../lib/office-visual";

type SourceFilter = "" | OfficeArchiveItem["source"];

export default function OfficeArchivePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<OfficeArchiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workspaceMarkdown, setWorkspaceMarkdown] = useState<string>("");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [departmentSlug, setDepartmentSlug] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [productId, setProductId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [source, setSource] = useState<SourceFilter>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const ou = searchParams.get("orgUnitId");
    const dept = searchParams.get("departmentSlug");
    const prod = searchParams.get("productId");
    if (ou) setOrgUnitId(ou);
    if (dept) setDepartmentSlug(dept);
    if (prod) setProductId(prod);
  }, [searchParams]);

  const refresh = useCallback(async () => {
    const result = await api.office.archive({
      departmentSlug: departmentSlug || undefined,
      orgUnitId: orgUnitId || undefined,
      productId: productId || undefined,
      agentName: agentName || undefined,
      source: source || undefined,
      q: search.trim() || undefined,
      limit: 120,
    });
    setData(result);
  }, [departmentSlug, orgUnitId, productId, agentName, source, search]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [refresh]);

  const items = data?.items ?? [];
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!selected || selected.source !== "workspace" || !selected.productId || !selected.path) {
      setWorkspaceMarkdown("");
      return;
    }
    if (selected.markdown.trim()) {
      setWorkspaceMarkdown(selected.markdown);
      return;
    }

    let cancelled = false;
    setWorkspaceLoading(true);
    api.products.code
      .file(selected.productId, selected.path)
      .then((file) => {
        if (!cancelled) setWorkspaceMarkdown(file.content);
      })
      .catch(() => {
        if (!cancelled) setWorkspaceMarkdown("");
      })
      .finally(() => {
        if (!cancelled) setWorkspaceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.source, selected?.productId, selected?.path, selected?.markdown]);

  const previewMarkdown =
    selected?.source === "workspace"
      ? workspaceMarkdown || (workspaceLoading ? t("office.archive.loadingDoc") : selected.preview)
      : (selected?.markdown ?? "");

  if (loading && !data) {
    return <PageLoading message={t("office.archive.loading")} />;
  }

  return (
    <div className="office-archive-page">
      <header className="office-archive-header">
        <div>
          <Link to="/office" className="office-dept-back">
            ← {t("office.title")}
          </Link>
          <h1 className="office-archive-title">{t("office.archive.title")}</h1>
          <p className="office-archive-subtitle">{t("office.archive.subtitle")}</p>
        </div>
        {data ? (
          <p className="office-archive-count">
            {t("office.archive.resultCount", { shown: items.length, total: data.total })}
          </p>
        ) : null}
      </header>

      <div className="office-archive-filters">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("office.archive.searchPlaceholder")}
          aria-label={t("office.archive.searchPlaceholder")}
        />
        <select
          className="office-task-select"
          value={departmentSlug}
          onChange={(e) => setDepartmentSlug(e.target.value)}
          aria-label={t("office.archive.filterDepartment")}
        >
          <option value="">{t("office.archive.allDepartments")}</option>
          {(data?.filters.departments ?? []).map((d) => (
            <option key={d.slug} value={d.slug}>
              {t(d.labelKey as "office.departments.strategy.name")}
            </option>
          ))}
        </select>
        <select
          className="office-task-select"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          aria-label={t("office.archive.filterProduct")}
        >
          <option value="">{t("office.archive.allProducts")}</option>
          {(data?.filters.products ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="office-task-select"
          value={orgUnitId}
          onChange={(e) => setOrgUnitId(e.target.value)}
          aria-label={t("office.archive.filterOrgUnit")}
        >
          <option value="">{t("office.archive.allOrgUnits")}</option>
          {(data?.filters.orgUnits ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          className="office-task-select"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          aria-label={t("office.archive.filterAgent")}
        >
          <option value="">{t("office.archive.allAgents")}</option>
          {(data?.filters.agents ?? []).map((name) => (
            <option key={name} value={name}>
              {t(agentRoleLabelKey(name) as "office.roles.research")}
            </option>
          ))}
        </select>
        <select
          className="office-task-select"
          value={source}
          onChange={(e) => setSource(e.target.value as SourceFilter)}
          aria-label={t("office.archive.filterSource")}
        >
          <option value="">{t("office.archive.allSources")}</option>
          <option value="encargo_summary">{t("office.archive.source.encargo_summary")}</option>
          <option value="encargo">{t("office.archive.source.encargo")}</option>
          <option value="workspace">{t("office.archive.source.workspace")}</option>
          <option value="artifact">{t("office.archive.source.artifact")}</option>
        </select>
      </div>

      <div className="office-archive-layout">
        <section className="office-archive-list-panel">
          {items.length === 0 ? (
            <p className="office-empty">{t("office.archive.empty")}</p>
          ) : (
            <ul className="office-archive-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="office-archive-item"
                    data-selected={item.id === selected?.id}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="office-archive-item-head">
                      <span className="office-archive-source" data-source={item.source}>
                        {t(`office.archive.source.${item.source}`)}
                      </span>
                      <time className="office-archive-time">
                        {new Date(item.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p className="office-archive-item-title">{item.title}</p>
                    {item.encargoTitle && item.source !== "encargo_summary" ? (
                      <p className="office-archive-item-meta">{item.encargoTitle}</p>
                    ) : null}
                    <p className="office-archive-item-meta">
                      {[
                        item.departmentSlug
                          ? t(`office.departments.${item.departmentSlug}.name` as "office.departments.strategy.name")
                          : null,
                        item.agentName
                          ? t(agentRoleLabelKey(item.agentName) as "office.roles.research")
                          : null,
                        item.productName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="office-archive-preview-panel">
          {!selected ? (
            <p className="office-empty">{t("office.archive.selectOne")}</p>
          ) : (
            <>
              <div className="office-archive-preview-head">
                <div>
                  <h2 className="office-archive-preview-title">{selected.title}</h2>
                  <p className="office-archive-preview-meta">
                    {t(`office.archive.source.${selected.source}`)}
                    {selected.path ? ` · ${selected.path}` : ""}
                  </p>
                </div>
                {selected.encargoHref ? (
                  <Link to={selected.encargoHref} className="office-link-btn">
                    {t("office.archive.openEncargo")} →
                  </Link>
                ) : null}
              </div>
              <div className="office-archive-preview-body">
                {workspaceLoading ? (
                  <p className="office-empty">{t("office.archive.loadingDoc")}</p>
                ) : previewMarkdown ? (
                  <RichMarkdownView
                    value={previewMarkdown}
                    className="border-[var(--office-border)] bg-[var(--office-surface-deep)]"
                  />
                ) : (
                  <p className="office-empty">{t("office.archive.noPreview")}</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
