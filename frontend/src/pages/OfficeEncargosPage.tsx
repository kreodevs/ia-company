import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Crosshair, Trash2 } from "lucide-react";
import { api, type OfficeEncargoPhase, type OfficeEncargoSummary } from "../lib/api";
import type { OrgUnit } from "../lib/org-types";
import {
  encargoContextLine,
  encargoTeamLabels,
  VIRTUAL_DEPARTMENT_SLUGS,
} from "../lib/office-encargo-display";
import PageLoading from "../components/ui/PageLoading";
import StatusBadge from "../components/ui/StatusBadge";
import RunScopeBadge from "../components/runs/RunScopeBadge";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Checkbox from "../components/atoms/Checkbox";
import { toast } from "../components/molecules/Sonner";
import { translateApiError } from "../lib/translate-error";

const PHASE_FILTERS: Array<OfficeEncargoPhase | "all"> = [
  "all",
  "in_progress",
  "delivered",
  "failed",
  "queued",
  "cancelled",
];

const ACTIVE_ENCARGO_STATUSES = new Set(["RUNNING", "DELEGATED", "AWAITING_USER"]);

function isEncargoDeletable(item: OfficeEncargoSummary): boolean {
  return !ACTIVE_ENCARGO_STATUSES.has(item.status);
}

export default function OfficeEncargosPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<OfficeEncargoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<OfficeEncargoPhase | "all">("all");
  const [departmentSlug, setDepartmentSlug] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.orgUnits.list().then(setOrgUnits).catch(() => setOrgUnits([]));
  }, []);

  const refresh = useCallback(async () => {
    const res = await api.office.encargos({
      limit: 50,
      phase: phase === "all" ? undefined : phase,
      departmentSlug: departmentSlug || undefined,
      orgUnitId: orgUnitId || undefined,
    });
    setItems(res.items);
    setSelectedIds((prev) => {
      const valid = new Set(res.items.map((item) => item.id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [phase, departmentSlug, orgUnitId]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const hasActive = items.some((item) => item.phase === "in_progress" || item.phase === "queued");
    if (!hasActive) return;
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [items, refresh]);

  const deletableItems = useMemo(() => items.filter(isEncargoDeletable), [items]);
  const selectedCount = selectedIds.size;
  const allDeletableSelected =
    deletableItems.length > 0 && deletableItems.every((item) => selectedIds.has(item.id));
  const someDeletableSelected = deletableItems.some((item) => selectedIds.has(item.id));

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allDeletableSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(deletableItems.map((item) => item.id)));
  };

  const handleDelete = async () => {
    if (selectedCount === 0) return;
    setDeleting(true);
    try {
      const result = await api.office.bulkDeleteEncargos([...selectedIds]);
      setSelectedIds(new Set());
      setConfirmDelete(false);
      await refresh();
      if (result.deleted.length > 0) {
        toast.success(
          t("office.encargos.deleteSuccess", {
            count: result.deleted.length,
            files: result.filesRemoved,
          }),
        );
      }
      if (result.skipped.length > 0) {
        toast.error(t("office.encargos.deletePartialSkip", { count: result.skipped.length }));
      }
    } catch (err) {
      toast.error(translateApiError(err, t, "office.encargos.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <PageLoading message={t("office.encargos.loading")} />;
  }

  return (
    <div className="office-page office-encargos-page">
      <header className="office-header">
        <div>
          <p className="office-eyebrow">{t("office.encargos.eyebrow")}</p>
          <h1 className="office-title">{t("office.encargos.title")}</h1>
          <p className="office-subtitle">{t("office.encargos.subtitle")}</p>
        </div>
        <Link to="/office" className="office-link-btn">
          {t("office.encargos.backToOffice")}
        </Link>
      </header>

      <div className="office-encargos-filters-row">
        <div className="office-encargos-filters" role="tablist" aria-label={t("office.encargos.filterLabel")}>
          {PHASE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={phase === filter}
              className={`office-encargos-filter ${phase === filter ? "office-encargos-filter-active" : ""}`}
              onClick={() => setPhase(filter)}
            >
              {t(`office.encargos.phase.${filter}`)}
            </button>
          ))}
        </div>
        <Select
          value={departmentSlug}
          onChange={(value) => {
            setDepartmentSlug(value);
            if (value) setOrgUnitId("");
          }}
          ariaLabel={t("office.encargos.filterDepartment")}
          className="office-encargos-dept-filter"
          size="sm"
          options={[
            { value: "", label: t("office.encargos.allDepartments") },
            ...VIRTUAL_DEPARTMENT_SLUGS.map((slug) => ({
              value: slug,
              label: t(`office.departments.${slug}.name` as "office.departments.strategy.name"),
            })),
          ]}
        />
        <Select
          value={orgUnitId}
          onChange={(value) => {
            setOrgUnitId(value);
            if (value) setDepartmentSlug("");
          }}
          ariaLabel={t("office.encargos.filterOrgUnit")}
          className="office-encargos-dept-filter"
          size="sm"
          options={[
            { value: "", label: t("office.encargos.allOrgUnits") },
            ...orgUnits.map((unit) => ({ value: unit.id, label: unit.name })),
          ]}
        />
      </div>

      {items.length === 0 ? (
        <div className="office-panel office-encargos-empty">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-sky-400/70" aria-hidden />
          <p className="office-empty">{t("office.encargos.empty")}</p>
          <Link to="/office" className="office-link-btn mt-4 inline-flex">
            {t("office.encargos.startFirst")}
          </Link>
        </div>
      ) : (
        <>
          {deletableItems.length > 0 ? (
            <div className="office-encargos-bulk-bar">
              <Checkbox
                checked={allDeletableSelected ? true : someDeletableSelected ? "indeterminate" : false}
                onChange={() => toggleSelectAll()}
                label={t("office.encargos.selectAllDeletable")}
              />
              {selectedCount > 0 ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {t("office.encargos.deleteSelected", { count: selectedCount })}
                </Button>
              ) : null}
            </div>
          ) : null}

          <ul className="office-encargos-list">
            {items.map((item) => {
              const deletable = isEncargoDeletable(item);
              return (
                <li key={item.id} className="office-encargo-list-item">
                  <div
                    className={`office-encargo-card-row ${selectedIds.has(item.id) ? "office-encargo-card-row-selected" : ""}`}
                  >
                    {deletable ? (
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onChange={(checked) => toggleSelect(item.id, checked)}
                        aria-label={t("office.encargos.selectEncargo", { title: item.title })}
                        className="office-encargo-select-cb"
                        onClick={(event) => event.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="office-encargo-select-placeholder"
                        title={t("office.encargos.cannotDeleteInProgress")}
                        aria-hidden
                      />
                    )}
                    <Link to={`/office/encargos/${item.id}`} className="office-encargo-card interactive">
                      <div className="office-encargo-card-head">
                        <span className="office-encargo-phase" data-phase={item.phase}>
                          {t(`office.encargos.phase.${item.phase}`)}
                        </span>
                        {item.scopeLabelKey && item.scopeLevel ? (
                          <RunScopeBadge
                            scope={{ level: item.scopeLevel, labelKey: item.scopeLabelKey }}
                          />
                        ) : null}
                        <StatusBadge
                          status={item.status}
                          label={t(`status.${item.status}`, { defaultValue: item.status })}
                        />
                      </div>
                      <h2 className="office-encargo-card-title">{item.title}</h2>
                      {item.request && item.request !== item.title ? (
                        <p className="office-encargo-card-request">{item.request}</p>
                      ) : null}
                      <div className="office-encargo-card-context">
                        <span className="office-encargo-context-chip">{encargoContextLine(item, t)}</span>
                      </div>
                      <div className="office-encargo-card-meta">
                        {item.productName ? <span>{item.productName}</span> : null}
                        <span>
                          {new Date(item.completedAt ?? item.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {item.totalCostUsd > 0 ? <span>${item.totalCostUsd.toFixed(2)}</span> : null}
                      </div>
                      {item.teamAgents.length > 0 ? (
                        <p className="office-encargo-card-team">
                          {t("office.encargos.team")}: {encargoTeamLabels(item.teamAgents, t)}
                        </p>
                      ) : null}
                      <div className="office-encargo-card-foot">
                        <span>
                          {item.documentCount > 0
                            ? t("office.encargos.documentsCount", { count: item.documentCount })
                            : t("office.encargos.noDocumentsYet")}
                        </span>
                        {item.productId && item.phase === "in_progress" ? (
                          <span className="office-encargo-war-link">
                            <Crosshair className="h-3.5 w-3.5" aria-hidden />
                            {t("office.encargos.watchWarRoom")}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t("office.encargos.deleteConfirmTitle", { count: selectedCount })}
        description={t("office.encargos.deleteConfirmDescription")}
        confirmLabel={t("office.encargos.deleteConfirmAction")}
        cancelLabel={t("common.cancel")}
        destructive
        busy={deleting}
        onCancel={() => (deleting ? undefined : setConfirmDelete(false))}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
