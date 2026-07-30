import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type OfficeArchiveItem, type TenantProduct } from "../lib/api";
import type { Artifact, OrgUnit, OrgUnitStaffRoster } from "../lib/org-types";
import PageLoading from "../components/ui/PageLoading";
import DepartmentRoomView from "../components/office/DepartmentRoomView";
import DepartmentStaffPanel from "../components/org/DepartmentStaffPanel";
import SchemaDynamicForm from "../components/org/SchemaDynamicForm";
import ArtifactGallery from "../components/org/ArtifactGallery";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import TabsBar from "../components/ui/TabsBar";
import { toast } from "../components/molecules/Sonner";
import { translateApiError } from "../lib/translate-error";

type DeptTab = "room" | "staff" | "settings";

const VALID_TABS: DeptTab[] = ["room", "staff", "settings"];

export default function OrgUnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as DeptTab | null;
  const activeTab: DeptTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "room";

  const setTab = (tab: DeptTab) => {
    setSearchParams(tab === "room" ? {} : { tab }, { replace: true });
  };

  const [unit, setUnit] = useState<OrgUnit | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<TenantProduct[]>([]);
  const [archiveItems, setArchiveItems] = useState<OfficeArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [launchTask, setLaunchTask] = useState("");
  const [launchProductId, setLaunchProductId] = useState("");
  const [launching, setLaunching] = useState(false);
  const [newWorkItemName, setNewWorkItemName] = useState("");
  const [newWorkItemKind, setNewWorkItemKind] = useState("client");
  const [creatingWorkItem, setCreatingWorkItem] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [staffRoster, setStaffRoster] = useState<OrgUnitStaffRoster | null>(null);

  const [departmentMeta, setDepartmentMeta] = useState<{
    status: "idle" | "busy";
    agentNames: string[];
    agents: Array<{
      id: string;
      name: string;
      role: string | null;
      status: "idle" | "busy";
      provisioned: boolean;
    }>;
    activeEncargoHref: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [u, arts, products, dashboard, archive, staff] = await Promise.all([
      api.orgUnits.get(id),
      api.orgUnits.artifacts(id),
      api.orgUnits.products(id),
      api.office.dashboard(),
      api.office.archive({ orgUnitId: id, limit: 8 }),
      api.orgUnits.staff(id),
    ]);
    setUnit(u);
    setArtifacts(arts);
    setLinkedProducts(products);
    setArchiveItems(archive.items);
    setStaffRoster(staff);
    setEditName(u.name);
    setEditDescription(u.description ?? "");

    const room = dashboard.departments.find((d) => d.id === id && d.kind === "org_unit");
    const agentsByName = new Map(dashboard.agents.map((agent) => [agent.name, agent]));
    setDepartmentMeta({
      status: room?.status ?? "idle",
      agentNames: staff.members.map((member) => member.name),
      agents: staff.members.map((member) => {
        const live = agentsByName.get(member.name);
        return {
          id: member.agentId ?? member.name,
          name: member.name,
          role: member.role,
          status: live?.status ?? "idle",
          provisioned: member.provisioned,
        };
      }),
      activeEncargoHref: room?.activeEncargoHref ?? null,
    });

    setLaunchProductId((prev) => prev || products[0]?.id || "");
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load().finally(() => setLoading(false));
  }, [id, load]);

  useEffect(() => {
    if (!departmentMeta || departmentMeta.status !== "busy") return;
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [departmentMeta?.status, load]);

  const subtitle = useMemo(() => {
    if (!unit) return "";
    const parts = [unit.type.replace(/_/g, " ")];
    if (unit.description?.trim()) parts.push(unit.description.trim());
    return parts.join(" · ");
  }, [unit]);

  const saveProfile = async () => {
    if (!unit) return;
    setSavingProfile(true);
    try {
      const updated = await api.orgUnits.update(unit.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setUnit(updated);
      toast.success(t("org.profileSaved"));
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setSavingProfile(false);
    }
  };

  const addWorkItem = async () => {
    if (!id || !newWorkItemName.trim()) return;
    setCreatingWorkItem(true);
    try {
      await api.orgUnits.createWorkItem(id, {
        name: newWorkItemName.trim(),
        workItemKind: newWorkItemKind as "product" | "client" | "campaign" | "project",
      });
      setNewWorkItemName("");
      toast.success(t("org.workItemCreated"));
      await load();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setCreatingWorkItem(false);
    }
  };

  const launchWork = async () => {
    if (!id || !launchTask.trim()) return;
    setLaunching(true);
    try {
      const result = await api.orgUnits.launch(id, {
        task: launchTask.trim(),
        productId: launchProductId || undefined,
      });
      toast.success(t("org.launchStarted"));
      navigate(`/office/encargos/${result.runId}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setLaunching(false);
    }
  };

  const deptTabs = useMemo(
    () => [
      { id: "room", label: t("org.tabs.room") },
      { id: "staff", label: t("org.tabs.staff") },
      { id: "settings", label: t("org.tabs.settings") },
    ],
    [t],
  );

  if (loading) return <PageLoading message={t("org.loading")} />;
  if (!unit || !departmentMeta || !staffRoster) {
    return (
      <div className="office-dept-page p-4">
        <p>{t("org.notFound")}</p>
        <Link to="/org-units" className="office-link-btn">
          ← {t("org.back")}
        </Link>
      </div>
    );
  }

  const navigation = (
    <div className="office-dept-tabs-wrap">
      <TabsBar tabs={deptTabs} activeId={activeTab} onChange={(next) => setTab(next as DeptTab)} />
    </div>
  );

  return (
    <DepartmentRoomView
      backHref="/org-units"
      backLabel={t("org.back")}
      title={unit.name}
      subtitle={subtitle}
      emoji="🏢"
      status={departmentMeta.status}
      agentNames={departmentMeta.agentNames}
      agents={departmentMeta.agents}
      activeEncargoHref={departmentMeta.activeEncargoHref}
      orgUnitId={unit.id}
      linkedProductIds={linkedProducts.map((product) => product.id)}
      showMeetingRoom={activeTab === "room"}
      navigation={navigation}
      headerActions={
        activeTab === "staff" ? (
          <Link to={`/ai-team?tab=create-agent&orgUnitId=${unit.id}`}>
            <Button variant="secondary" size="sm">
              {t("org.createAgentForDept")}
            </Button>
          </Link>
        ) : null
      }
      sidebarFooter={
        activeTab === "room" ? (
          <>
            <h2 className="office-panel-title" style={{ marginTop: "1.25rem" }}>
              {t("office.floor.recentDocs")}
            </h2>
            {archiveItems.length === 0 ? (
              <p className="office-empty">{t("org.noArtifacts")}</p>
            ) : (
              <ul className="office-activity-list">
                {archiveItems.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Link to="/office/archive" className="office-activity-item">
                      <p className="office-activity-title">{item.title}</p>
                      <p className="office-activity-meta">
                        {t(`office.archive.source.${item.source}`)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to={`/office/archive?orgUnitId=${unit.id}`}
              className="office-roi-link"
              style={{ display: "inline-block", marginTop: "0.65rem" }}
            >
              {t("office.floor.viewArchive")} →
            </Link>
          </>
        ) : null
      }
    >
      {activeTab === "staff" ? (
        <DepartmentStaffPanel
          orgUnitId={unit.id}
          orgUnitName={unit.name}
          orgUnitType={unit.type}
          roster={staffRoster}
          onRefresh={() => void load()}
        />
      ) : null}

      {activeTab === "settings" ? (
        <>
          <section className="office-dept-extra-panel">
            <h2 className="office-panel-title">{t("org.profileTitle")}</h2>
            <p className="office-dept-extra-desc">{t("org.profileSubtitle")}</p>
            <div className="office-dept-extra-form office-dept-extra-form-grid">
              <Input
                label={t("common.name")}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={savingProfile}
              />
              <Input
                label={t("common.description")}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={savingProfile}
              />
              <Button
                onClick={() => void saveProfile()}
                disabled={savingProfile || !editName.trim()}
              >
                {savingProfile ? t("common.saving") : t("org.saveProfile")}
              </Button>
            </div>
          </section>

          <section className="office-dept-extra-panel">
            <h2 className="office-panel-title">{t("org.launchTitle")}</h2>
            <p className="office-dept-extra-desc">{t("org.launchSubtitle")}</p>
            <div className="office-dept-extra-form">
              <Input
                label={t("org.launchTaskLabel")}
                value={launchTask}
                onChange={(e) => setLaunchTask(e.target.value)}
                placeholder={t("org.launchTaskPlaceholder")}
                disabled={launching}
              />
              {linkedProducts.length > 0 ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                    {t("org.launchProductLabel")}
                  </label>
                  <Select
                    value={launchProductId}
                    onChange={setLaunchProductId}
                    options={linkedProducts.map((p) => ({ value: p.id, label: p.name }))}
                    ariaLabel={t("org.launchProductLabel")}
                  />
                </div>
              ) : (
                <p className="text-xs text-[var(--foreground-muted)]">{t("org.launchNeedsProduct")}</p>
              )}
              <Button
                onClick={() => void launchWork()}
                disabled={launching || !launchTask.trim() || linkedProducts.length === 0}
              >
                {launching ? t("org.launching") : t("org.launchCta")}
              </Button>
            </div>
          </section>

          {linkedProducts.length > 0 ? (
            <section className="office-dept-extra-panel">
              <h2 className="office-panel-title">{t("org.linkedProductsTitle")}</h2>
              <ul className="office-dept-linked-list">
                {linkedProducts.map((p) => (
                  <li key={p.id}>
                    <Link to={`/products/${p.id}/settings`} className="office-link-inline">
                      {p.name}
                    </Link>
                    <span className="office-dept-linked-kind">({p.workItemKind ?? "product"})</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="office-dept-extra-panel">
            <h2 className="office-panel-title">{t("org.addWorkItemTitle")}</h2>
            <p className="office-dept-extra-desc">{t("org.addWorkItemSubtitle")}</p>
            <div className="office-dept-extra-form office-dept-extra-form-grid">
              <Input
                label={t("org.addWorkItemName")}
                value={newWorkItemName}
                onChange={(e) => setNewWorkItemName(e.target.value)}
                placeholder={t("org.addWorkItemNamePlaceholder")}
                disabled={creatingWorkItem}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                  {t("org.studio.workItemKindLabel")}
                </label>
                <Select
                  value={newWorkItemKind}
                  onChange={setNewWorkItemKind}
                  options={[
                    { value: "product", label: t("products.settings.workItemKind.product") },
                    { value: "client", label: t("products.settings.workItemKind.client") },
                    { value: "campaign", label: t("products.settings.workItemKind.campaign") },
                    { value: "project", label: t("products.settings.workItemKind.project") },
                  ]}
                  ariaLabel={t("org.studio.workItemKindLabel")}
                />
              </div>
              <Button
                onClick={() => void addWorkItem()}
                disabled={creatingWorkItem || !newWorkItemName.trim()}
              >
                {creatingWorkItem ? t("org.addWorkItemCreating") : t("org.addWorkItemCta")}
              </Button>
            </div>
          </section>

          <section className="office-dept-extra-panel">
            <h2 className="office-panel-title">{t("org.configTitle")}</h2>
            {unit.configSchema?.sections?.length || unit.configSchema?.fields?.length ? (
              <SchemaDynamicForm
                schema={unit.configSchema}
                initialValues={unit.config as Record<string, unknown>}
                submitting={saving}
                submitText={t("org.saveConfig")}
                onSubmit={async (values) => {
                  setSaving(true);
                  try {
                    const updated = await api.orgUnits.update(unit.id, { config: values });
                    setUnit(updated);
                    toast.success(t("org.configSaved"));
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            ) : (
              <p className="office-empty">{t("org.noConfigSchema")}</p>
            )}
          </section>

          <section className="office-dept-extra-panel">
            <h2 className="office-panel-title">{t("org.designTitle")}</h2>
            <pre className="office-dept-design-preview">{unit.designMd ?? t("org.noDesignMd")}</pre>
          </section>

          <section className="office-dept-extra-panel">
            <h2 className="office-panel-title">{t("org.artifactsTitle")}</h2>
            <ArtifactGallery
              artifacts={artifacts}
              onStatusChange={async (artifactId, status) => {
                await api.orgUnits.updateArtifactStatus(artifactId, status);
                await load();
              }}
            />
          </section>
        </>
      ) : null}
    </DepartmentRoomView>
  );
}
