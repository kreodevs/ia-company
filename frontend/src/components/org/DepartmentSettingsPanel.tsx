import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TenantProduct } from "../../lib/api";
import type { Artifact, OrgUnit } from "../../lib/org-types";
import SchemaDynamicForm from "./SchemaDynamicForm";
import ArtifactGallery from "./ArtifactGallery";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import TabsBar from "../ui/TabsBar";
import { toast } from "../molecules/Sonner";
import { translateApiError } from "../../lib/translate-error";
import { api } from "../../lib/api";

export type SettingsSection = "profile" | "operations" | "config" | "assets";

const VALID_SECTIONS: SettingsSection[] = ["profile", "operations", "config", "assets"];

export interface DepartmentSettingsPanelProps {
  unit: OrgUnit;
  linkedProducts: TenantProduct[];
  artifacts: Artifact[];
  editName: string;
  editDescription: string;
  savingProfile: boolean;
  launchTask: string;
  launchProductId: string;
  launching: boolean;
  newWorkItemName: string;
  newWorkItemKind: string;
  creatingWorkItem: boolean;
  onEditNameChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onLaunchTaskChange: (value: string) => void;
  onLaunchProductIdChange: (value: string) => void;
  onNewWorkItemNameChange: (value: string) => void;
  onNewWorkItemKindChange: (value: string) => void;
  onSaveProfile: () => Promise<void>;
  onLaunchWork: () => Promise<void>;
  onAddWorkItem: () => Promise<void>;
  onUnitUpdated: (unit: OrgUnit) => void;
  onRefresh: () => Promise<void>;
}

export default function DepartmentSettingsPanel({
  unit,
  linkedProducts,
  artifacts,
  editName,
  editDescription,
  savingProfile,
  launchTask,
  launchProductId,
  launching,
  newWorkItemName,
  newWorkItemKind,
  creatingWorkItem,
  onEditNameChange,
  onEditDescriptionChange,
  onLaunchTaskChange,
  onLaunchProductIdChange,
  onNewWorkItemNameChange,
  onNewWorkItemKindChange,
  onSaveProfile,
  onLaunchWork,
  onAddWorkItem,
  onUnitUpdated,
  onRefresh,
}: DepartmentSettingsPanelProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [savingConfig, setSavingConfig] = useState(false);
  const sectionParam = searchParams.get("section") as SettingsSection | null;
  const activeSection: SettingsSection =
    sectionParam && VALID_SECTIONS.includes(sectionParam) ? sectionParam : "profile";

  useEffect(() => {
    if (sectionParam && VALID_SECTIONS.includes(sectionParam)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "settings");
        next.set("section", "profile");
        return next;
      },
      { replace: true },
    );
  }, [sectionParam, setSearchParams]);

  const setSection = (section: SettingsSection) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "settings");
        next.set("section", section);
        return next;
      },
      { replace: true },
    );
  };

  const settingsTabs = useMemo(
    () => [
      { id: "profile", label: t("org.settingsTabs.profile") },
      { id: "operations", label: t("org.settingsTabs.operations") },
      { id: "config", label: t("org.settingsTabs.config") },
      { id: "assets", label: t("org.settingsTabs.assets") },
    ],
    [t],
  );

  const hasConfigSchema = Boolean(
    unit.configSchema?.sections?.length || unit.configSchema?.fields?.length,
  );

  return (
    <div className="office-dept-settings-panel">
      <div className="office-dept-settings-tabs">
        <TabsBar
          tabs={settingsTabs}
          activeId={activeSection}
          onChange={(next) => setSection(next as SettingsSection)}
        />
      </div>

      <div className="office-dept-settings-body">
        {activeSection === "profile" ? (
          <section className="office-dept-settings-section">
            <h2 className="office-panel-title">{t("org.profileTitle")}</h2>
            <p className="office-dept-extra-desc">{t("org.profileSubtitle")}</p>
            <div className="office-dept-extra-form office-dept-extra-form-grid">
              <Input
                label={t("common.name")}
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                disabled={savingProfile}
              />
              <Input
                label={t("common.description")}
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                disabled={savingProfile}
              />
              <Button
                onClick={() => void onSaveProfile()}
                disabled={savingProfile || !editName.trim()}
              >
                {savingProfile ? t("common.saving") : t("org.saveProfile")}
              </Button>
            </div>
          </section>
        ) : null}

        {activeSection === "operations" ? (
          <div className="office-dept-settings-stack">
            <section className="office-dept-settings-section">
              <h2 className="office-panel-title">{t("org.launchTitle")}</h2>
              <p className="office-dept-extra-desc">{t("org.launchSubtitle")}</p>
              <div className="office-dept-extra-form">
                <Input
                  label={t("org.launchTaskLabel")}
                  value={launchTask}
                  onChange={(e) => onLaunchTaskChange(e.target.value)}
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
                      onChange={onLaunchProductIdChange}
                      options={linkedProducts.map((p) => ({ value: p.id, label: p.name }))}
                      ariaLabel={t("org.launchProductLabel")}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--foreground-muted)]">{t("org.launchNeedsProduct")}</p>
                )}
                <Button
                  onClick={() => void onLaunchWork()}
                  disabled={launching || !launchTask.trim() || linkedProducts.length === 0}
                >
                  {launching ? t("org.launching") : t("org.launchCta")}
                </Button>
              </div>
            </section>

            {linkedProducts.length > 0 ? (
              <section className="office-dept-settings-section">
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

            <section className="office-dept-settings-section">
              <h2 className="office-panel-title">{t("org.addWorkItemTitle")}</h2>
              <p className="office-dept-extra-desc">{t("org.addWorkItemSubtitle")}</p>
              <div className="office-dept-extra-form office-dept-extra-form-grid">
                <Input
                  label={t("org.addWorkItemName")}
                  value={newWorkItemName}
                  onChange={(e) => onNewWorkItemNameChange(e.target.value)}
                  placeholder={t("org.addWorkItemNamePlaceholder")}
                  disabled={creatingWorkItem}
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                    {t("org.studio.workItemKindLabel")}
                  </label>
                  <Select
                    value={newWorkItemKind}
                    onChange={onNewWorkItemKindChange}
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
                  onClick={() => void onAddWorkItem()}
                  disabled={creatingWorkItem || !newWorkItemName.trim()}
                >
                  {creatingWorkItem ? t("org.addWorkItemCreating") : t("org.addWorkItemCta")}
                </Button>
              </div>
            </section>
          </div>
        ) : null}

        {activeSection === "config" ? (
          <section className="office-dept-settings-section">
            <h2 className="office-panel-title">{t("org.configTitle")}</h2>
            {hasConfigSchema ? (
              <SchemaDynamicForm
                schema={unit.configSchema}
                initialValues={unit.config as Record<string, unknown>}
                submitting={savingConfig}
                submitText={t("org.saveConfig")}
                onSubmit={async (values) => {
                  setSavingConfig(true);
                  try {
                    const updated = await api.orgUnits.update(unit.id, { config: values });
                    onUnitUpdated(updated);
                    toast.success(t("org.configSaved"));
                  } catch (err) {
                    toast.error(translateApiError(err, t, "common.saveFailed"));
                    throw err;
                  } finally {
                    setSavingConfig(false);
                  }
                }}
              />
            ) : (
              <p className="office-empty">{t("org.noConfigSchema")}</p>
            )}
          </section>
        ) : null}

        {activeSection === "assets" ? (
          <div className="office-dept-settings-stack">
            <section className="office-dept-settings-section">
              <h2 className="office-panel-title">{t("org.designTitle")}</h2>
              <pre className="office-dept-design-preview">{unit.designMd ?? t("org.noDesignMd")}</pre>
            </section>

            <section className="office-dept-settings-section">
              <h2 className="office-panel-title">{t("org.artifactsTitle")}</h2>
              <ArtifactGallery
                artifacts={artifacts}
                onStatusChange={async (artifactId, status) => {
                  await api.orgUnits.updateArtifactStatus(artifactId, status);
                  await onRefresh();
                }}
              />
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
