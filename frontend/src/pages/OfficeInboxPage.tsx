import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ExternalLink } from "lucide-react";
import { api, type OfficeInboxItem, type OfficeInboxCategory } from "../lib/api";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Button from "../components/ui/Button";
import StatusPill from "../components/ui/StatusPill";
import { toast } from "../components/molecules/Sonner";

const INBOX_CATEGORIES: OfficeInboxCategory[] = [
  "decision",
  "handoff",
  "blocked",
  "review",
  "cost",
  "failure",
  "info",
];

const PRIORITY_CATEGORIES = new Set<OfficeInboxCategory>([
  "decision",
  "blocked",
  "handoff",
  "review",
  "failure",
]);

const PRIMARY_FILTERS: Array<"priority" | "all" | OfficeInboxCategory> = [
  "priority",
  "all",
  "decision",
  "blocked",
];

export type InboxFilter = "priority" | "all" | OfficeInboxCategory;

function parseInboxFilter(param: string | null): InboxFilter {
  if (!param || param === "priority") return "priority";
  if (param === "all") return "all";
  if (INBOX_CATEGORIES.includes(param as OfficeInboxCategory)) return param as OfficeInboxCategory;
  return "priority";
}

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

function sortInboxItems(a: OfficeInboxItem, b: OfficeInboxItem): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function followUpHref(item: OfficeInboxItem): string {
  if (item.href?.startsWith("/")) return item.href;
  if (item.runId) return `/office/trabajo?tab=activos&run=${encodeURIComponent(item.runId)}`;
  return "/office/trabajo";
}

export default function OfficeInboxPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allItems, setAllItems] = useState<OfficeInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const filter = parseInboxFilter(searchParams.get("category"));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const needsFullList = filter === "priority" || filter === "all";
      const data = await api.office.inbox(
        needsFullList ? undefined : { category: filter },
      );
      setAllItems(data.items);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (next: InboxFilter) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === "priority") params.delete("category");
      else params.set("category", next);
      return params;
    });
  };

  const items = useMemo(() => {
    let list = allItems;
    if (filter === "priority") {
      list = allItems.filter((i) => PRIORITY_CATEGORIES.has(i.category));
    } else if (filter !== "all") {
      list = allItems.filter((i) => i.category === filter);
    }
    return [...list].sort(sortInboxItems);
  }, [allItems, filter]);

  const priorityCount = useMemo(
    () => allItems.filter((i) => PRIORITY_CATEGORIES.has(i.category)).length,
    [allItems],
  );

  const nextItem = filter === "priority" && items.length > 0 ? items[0] : null;

  const resolveItem = async (item: OfficeInboxItem) => {
    if (!item.resolve || busyIds.has(item.id)) return;
    const newBusy = new Set(busyIds);
    newBusy.add(item.id);
    setBusyIds(newBusy);
    try {
      await api.office.resolveInboxItem(item.resolve);
      setAllItems((prev) => prev.filter((i) => i.id !== item.id));
      const href = followUpHref(item);
      toast.success(t("office.inbox.resolvedToast"), {
        action: {
          label: t("office.inbox.continueWork"),
          onClick: () => navigate(href),
        },
      });
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

  const categoryLabel = (cat: OfficeInboxCategory) =>
    t(`office.inbox.tab${cat.charAt(0).toUpperCase() + cat.slice(1)}`);

  if (loading) {
    return (
      <PageFrame width="office" className="office-page office-inbox-page">
        <PageHeader variant="command" title={t("office.inbox.title")} subtitle={t("office.inbox.subtitle")} />
        <PageLoading message={t("office.inbox.loading")} />
      </PageFrame>
    );
  }

  return (
    <PageFrame width="office" className="office-page office-inbox-page">
      <PageHeader
        variant="command"
        title={t("office.inbox.title")}
        subtitle={t("office.inbox.subtitle")}
        meta={
          priorityCount > 0 ? (
            <StatusPill status="pending">
              {priorityCount} {t("office.inbox.priorityCount")}
            </StatusPill>
          ) : (
            <StatusPill status="completed">{t("office.inbox.emptyActionable")}</StatusPill>
          )
        }
      />

      <div className="office-inbox-toolbar">
        <div className="office-inbox-filters" role="tablist" aria-label={t("office.inbox.filtersLabel")}>
          {PRIMARY_FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`office-inbox-filter ${filter === key ? "office-inbox-filter-active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {key === "priority"
                ? t("office.inbox.tabPriority")
                : key === "all"
                  ? t("office.inbox.tabAll")
                  : categoryLabel(key)}
            </button>
          ))}
        </div>
        <details className="office-inbox-more-filters">
          <summary>{t("office.inbox.moreCategories")}</summary>
          <div className="office-inbox-filters office-inbox-filters-secondary" role="tablist">
            {INBOX_CATEGORIES.filter((c) => !PRIMARY_FILTERS.includes(c)).map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={filter === cat}
                className={`office-inbox-filter ${filter === cat ? "office-inbox-filter-active" : ""}`}
                onClick={() => setFilter(cat)}
              >
                {categoryLabel(cat)}
              </button>
            ))}
          </div>
        </details>
      </div>

      {nextItem ? (
        <section className="office-inbox-next" aria-label={t("office.inbox.nextUp")}>
          <p className="office-inbox-next-label">{t("office.inbox.nextUp")}</p>
          <article className="office-inbox-next-card">
            <StatusPill status={categoryPill(nextItem.category)}>
              {categoryLabel(nextItem.category)}
            </StatusPill>
            <h3 className="office-inbox-next-title">{nextItem.title}</h3>
            {nextItem.body ? <p className="office-inbox-item-body">{nextItem.body}</p> : null}
            <div className="office-inbox-next-actions">
              {nextItem.runId ? (
                <Link
                  to={`/office/encargos/${nextItem.runId}`}
                  className="office-link-btn office-link-btn-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {t("office.inbox.openEncargo")}
                </Link>
              ) : null}
              {nextItem.resolve && nextItem.category !== "info" ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busyIds.has(nextItem.id)}
                  onClick={() => void resolveItem(nextItem)}
                >
                  {busyIds.has(nextItem.id) ? (
                    <span className="office-spinner-sm" aria-hidden />
                  ) : (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                      {t("office.inbox.resolve")}
                    </>
                  )}
                </Button>
              ) : nextItem.href ? (
                <Button size="sm" variant="secondary" onClick={() => navigate(followUpHref(nextItem))}>
                  {t("office.inbox.continueWork")}
                </Button>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title={t("office.inbox.emptyTitle")}
          description={t("office.inbox.emptyDesc")}
          action={
            <Link to="/office#office-coordinator-chat" className="office-link-btn office-link-btn-emphasis">
              {t("office.emptyCta.coordinator")}
            </Link>
          }
        />
      ) : (
        <div className="office-inbox-groups">
          {grouped.map(([cat, group]) => (
            <section key={cat} className="office-inbox-group">
              <h3 className="office-inbox-group-title">
                <span className="office-inbox-group-label">{categoryLabel(cat)}</span>
                <span className="office-inbox-group-count">{group.length}</span>
              </h3>
              <ul className="office-inbox-list">
                {group.map((item) => {
                  if (nextItem && item.id === nextItem.id && filter === "priority") return null;
                  return (
                    <li key={item.id} className="office-inbox-item">
                      <div className="office-inbox-item-main">
                        <StatusPill status={categoryPill(item.category)}>
                          {categoryLabel(item.category)}
                        </StatusPill>
                        <div className="office-inbox-item-content">
                          <h4 className="office-inbox-item-title">{item.title}</h4>
                          {item.body && <p className="office-inbox-item-body">{item.body}</p>}
                          <div className="office-inbox-item-meta">
                            <time dateTime={item.createdAt}>
                              {new Date(item.createdAt).toLocaleString()}
                            </time>
                            {item.runId && (
                              <Link
                                to={`/office/encargos/${item.runId}`}
                                className="office-link-btn office-link-btn-muted"
                              >
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
                      ) : item.href ? (
                        <div className="office-inbox-item-actions">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(followUpHref(item))}
                          >
                            {t("office.inbox.continueWork")}
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
