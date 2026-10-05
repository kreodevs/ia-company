import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ExternalLink } from "lucide-react";
import { api, type OfficeInboxItem, type OfficeInboxCategory } from "../lib/api";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Button from "../components/ui/Button";
import StatusPill from "../components/ui/StatusPill";

const INBOX_CATEGORIES: OfficeInboxCategory[] = [
  "decision",
  "handoff",
  "blocked",
  "review",
  "cost",
  "failure",
  "info",
];

const CATEGORY_LABEL: Record<OfficeInboxCategory, string> = {
  decision: "Decisión",
  handoff: "Handoff",
  blocked: "Bloqueado",
  review: "Revisión",
  cost: "Coste",
  failure: "Fallo",
  info: "Info",
};

function categoryPill(category: OfficeInboxCategory): string {
  switch (category) {
    case "decision":
      return "running";
    case "handoff":
      return "pending";
    case "blocked":
      return "running";
    case "failure":
      return "cancelled";
    case "review":
      return "pending";
    case "cost":
      return "running";
    default:
      return "pending";
  }
}

export default function OfficeInboxPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<OfficeInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<OfficeInboxCategory | "all">(
    (searchParams.get("category") as OfficeInboxCategory) ?? "all",
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.office.inbox(
        category === "all" ? undefined : { category },
      );
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (category !== "all") {
      const params = new URLSearchParams(searchParams);
      params.set("category", category);
      setSearchParams(params);
    } else {
      const params = new URLSearchParams(searchParams);
      params.delete("category");
      setSearchParams(params);
    }
  }, [category, searchParams, setSearchParams]);

  const resolveItem = async (item: OfficeInboxItem) => {
    if (!item.resolve || busyIds.has(item.id)) return;
    const newBusy = new Set(busyIds);
    newBusy.add(item.id);
    setBusyIds(newBusy);
    try {
      await api.office.resolveInboxItem(item.resolve);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      const newBusy2 = new Set(busyIds);
      newBusy2.delete(item.id);
      setBusyIds(newBusy2);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<OfficeInboxCategory, OfficeInboxItem[]>();
    INBOX_CATEGORIES.forEach((cat) => map.set(cat, []));
    items.forEach((i) => map.get(i.category)!.push(i));
    return Array.from(map.entries()).filter(([, v]) => v.length > 0);
  }, [items]);

  if (loading) {
    return (
      <PageFrame width="office" className="office-page office-inbox-page">
        <PageHeader variant="command" title={t("office.inbox.title")} subtitle={t("office.inbox.subtitle")} />
        <PageLoading message={t("office.inbox.loading")} />
      </PageFrame>
    );
  }

  const totalActionable = items.filter(
    (i) => i.category !== "info" && i.category !== "cost",
  ).length;

  return (
    <PageFrame width="office" className="office-page office-inbox-page">
      <PageHeader
        variant="command"
        title={t("office.inbox.title")}
        subtitle={t("office.inbox.subtitle")}
        meta={
          totalActionable > 0 ? (
            <StatusPill status="pending">{totalActionable} {t("office.inbox.actionable")}</StatusPill>
          ) : (
            <StatusPill status="completed">{t("office.inbox.emptyActionable")}</StatusPill>
          )
        }
      />

      <div className="office-inbox-filters" role="tablist" aria-label={t("office.inbox.filtersLabel")}>
        <button
          type="button"
          role="tab"
          aria-selected={category === "all"}
          className={`office-inbox-filter ${category === "all" ? "office-inbox-filter-active" : ""}`}
          onClick={() => setCategory("all")}
        >
          {t("office.inbox.tabAll")}
        </button>
        {INBOX_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={category === cat}
            className={`office-inbox-filter ${category === cat ? "office-inbox-filter-active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {t(`office.inbox.tab${cat.charAt(0).toUpperCase() + cat.slice(1)}`)}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={t("office.inbox.emptyTitle")}
          description={t("office.inbox.emptyDesc")}
        />
      ) : (
        <div className="office-inbox-groups">
          {grouped.map(([cat, group]) => (
            <section key={cat} className="office-inbox-group">
              <h3 className="office-inbox-group-title">
                <span className="office-inbox-group-label">{t(`office.inbox.tab${cat.charAt(0).toUpperCase() + cat.slice(1)}`)}</span>
                <span className="office-inbox-group-count">{group.length}</span>
              </h3>
              <ul className="office-inbox-list">
                {group.map((item) => (
                  <li key={item.id} className="office-inbox-item">
                    <div className="office-inbox-item-main">
                      <StatusPill status={categoryPill(item.category)}>
                        {CATEGORY_LABEL[item.category]}
                      </StatusPill>
                      <div className="office-inbox-item-content">
                        <h4 className="office-inbox-item-title">{item.title}</h4>
                        {item.body && <p className="office-inbox-item-body">{item.body}</p>}
                        <div className="office-inbox-item-meta">
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleString()}
                          </time>
                          {item.runId && (
                            <Link to={`/office/encargos/${item.runId}`} className="office-link-btn office-link-btn-muted">
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              {t("office.inbox.openEncargo")}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.resolve && item.category !== "info" ? (
                      <div className="office-inbox-item-actions">
                        <Button
                          size="sm"
                          variant={item.category === "decision" ? "secondary" : "primary"}
                          disabled={busyIds.has(item.id)}
                          onClick={() => void resolveItem(item)}
                        >
                          {busyIds.has(item.id) ? (
                            <span className="office-spinner-sm" aria-hidden />
                          ) : (
                            <>
                              <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                              {t("office.inbox.resolve")}
                            </>
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageFrame>
  );
}