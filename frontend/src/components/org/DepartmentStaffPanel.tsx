import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { agentDisplayLabel, humanizeAgentSlug } from "../../lib/office-visual";
import { api } from "../../lib/api";
import type { OrgUnitStaffRoster } from "../../lib/org-types";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Select from "../ui/Select";
import TabsBar from "../ui/TabsBar";
import CatalogStudioAgentPanel from "../catalog-studio/CatalogStudioAgentPanel";

type HireMode = "create" | "incorporate";
const VALID_HIRE_MODES: HireMode[] = ["create", "incorporate"];

interface DepartmentStaffPanelProps {
  orgUnitId: string;
  orgUnitName: string;
  orgUnitType: string;
  roster: OrgUnitStaffRoster;
  onRefresh?: () => void;
}

function buildGapBrief(orgUnitName: string, missing: OrgUnitStaffRoster["members"]): string {
  const roles = missing
    .map((seat) => seat.role?.trim() || humanizeAgentSlug(seat.name))
    .join(", ");
  return `Departamento "${orgUnitName}". Roles definidos pero aún no creados en Equipo IA: ${roles}. Propón el agente más prioritario para contratar ahora, con skills existentes o nuevas y grants MCP concretos.`;
}

function buildRoleBrief(orgUnitName: string, seat: OrgUnitStaffRoster["members"][number]): string {
  const role = seat.role?.trim() || humanizeAgentSlug(seat.name);
  return `Necesito crear el puesto de ${role} para el departamento "${orgUnitName}". Define el agente con system prompt completo, skills de catálogo y herramientas MCP que necesite.`;
}

function buildExpandBrief(orgUnitName: string, orgUnitType: string): string {
  return `Departamento "${orgUnitName}" (tipo ${orgUnitType.replace(/_/g, " ")}). Quiero añadir un puesto nuevo más allá de la plantilla inicial. Propón un agente adicional con rol claro, skills y herramientas MCP — sin límite de tamaño de plantilla.`;
}

export default function DepartmentStaffPanel({
  orgUnitId,
  orgUnitName,
  orgUnitType,
  roster,
  onRefresh,
}: DepartmentStaffPanelProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const hireParam = searchParams.get("hire") as HireMode | null;
  const hireMode: HireMode =
    hireParam && VALID_HIRE_MODES.includes(hireParam) ? hireParam : "create";

  const setHireMode = (mode: HireMode) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "staff");
        next.set("hire", mode);
        return next;
      },
      { replace: true },
    );
  };

  const hireTabs = useMemo(
    () => [
      { id: "create", label: t("org.staff.hireTabs.create") },
      { id: "incorporate", label: t("org.staff.hireTabs.incorporate") },
    ],
    [t],
  );

  const [brief, setBrief] = useState("");
  const [assistantKey, setAssistantKey] = useState(0);
  const [linkAgentName, setLinkAgentName] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinkingName, setUnlinkingName] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const members = roster.members;
  const missing = useMemo(() => members.filter((seat) => !seat.provisioned), [members]);
  const activeCount = members.length - missing.length;
  const addedCount = members.filter((seat) => seat.source === "added").length;

  const openAssistant = (nextBrief: string) => {
    setBrief(nextBrief);
    setAssistantKey((value) => value + 1);
  };

  const linkExisting = async () => {
    if (!linkAgentName) return;
    setLinking(true);
    setLinkError(null);
    try {
      await api.orgUnits.linkStaffAgent(orgUnitId, linkAgentName);
      setLinkAgentName("");
      onRefresh?.();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setLinking(false);
    }
  };

  const unlinkMember = async (agentName: string) => {
    if (!confirm(t("org.staff.unlinkConfirm", { name: agentName }))) return;
    setUnlinkingName(agentName);
    setLinkError(null);
    try {
      await api.orgUnits.unlinkStaffAgent(orgUnitId, agentName);
      onRefresh?.();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setUnlinkingName(null);
    }
  };

  return (
    <section className="office-dept-extra-panel office-dept-staff-panel">
      <div className="office-dept-staff-header">
        <div>
          <h2 className="office-panel-title">{t("org.staff.title")}</h2>
          <p className="office-dept-extra-desc">{t("org.staff.subtitle")}</p>
          {roster.templateRoleCount > 0 ? (
            <p className="office-dept-staff-template-note">
              {t("org.staff.templateNote", {
                count: roster.templateRoleCount,
                added: addedCount,
              })}
            </p>
          ) : null}
        </div>
        <Badge variant={missing.length === 0 ? "default" : "primary"}>
          {t("org.staff.rosterCount", { active: activeCount, total: members.length })}
        </Badge>
      </div>

      {members.length === 0 ? (
        <p className="office-empty">{t("org.staff.emptyRoster")}</p>
      ) : (
        <ul className="office-dept-staff-list">
          {members.map((seat) => (
            <li key={seat.name} className="office-dept-staff-item">
              <div className="office-dept-staff-item-main">
                <p className="office-dept-staff-name">{agentDisplayLabel(seat, t)}</p>
                <p className="office-dept-staff-slug">
                  {seat.name}
                  {seat.source === "added" ? ` · ${t("org.staff.addedRole")}` : ""}
                </p>
              </div>
              <div className="office-dept-staff-item-actions">
                {seat.provisioned ? (
                  <Badge>{t("org.staff.active")}</Badge>
                ) : (
                  <>
                    <Badge variant="primary">{t("org.staff.missing")}</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openAssistant(buildRoleBrief(orgUnitName, seat))}
                    >
                      {t("org.staff.createWithAi")}
                    </Button>
                  </>
                )}
                {seat.source === "added" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={unlinkingName === seat.name}
                    onClick={() => void unlinkMember(seat.name)}
                  >
                    {unlinkingName === seat.name ? t("org.staff.unlinking") : t("org.staff.unlink")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="office-dept-staff-hire">
        <TabsBar tabs={hireTabs} activeId={hireMode} onChange={(next) => setHireMode(next as HireMode)} />

        <div className="office-dept-staff-hire-body">
          {hireMode === "incorporate" ? (
            <div className="office-dept-staff-incorporate">
              <h3 className="office-dept-staff-assistant-title">{t("org.staff.incorporateTitle")}</h3>
              <p className="office-dept-extra-desc">{t("org.staff.incorporateHint")}</p>
              {roster.availableAgents.length > 0 ? (
                <div className="office-dept-staff-link-row office-dept-staff-link-row-panel">
                  <label htmlFor="link-existing-agent" className="office-dept-scope-label">
                    {t("org.staff.linkExisting")}
                  </label>
                  <Select
                    id="link-existing-agent"
                    value={linkAgentName}
                    onChange={setLinkAgentName}
                    options={[
                      { value: "", label: t("org.staff.linkExistingPlaceholder") },
                      ...roster.availableAgents.map((agent) => ({
                        value: agent.name,
                        label:
                          agent.otherDepartments.length > 0
                            ? t("org.staff.linkExistingOptionWithDept", {
                                role: agent.role || humanizeAgentSlug(agent.name),
                                name: agent.name,
                                departments: agent.otherDepartments.join(", "),
                              })
                            : t("org.staff.linkExistingOption", {
                                role: agent.role || humanizeAgentSlug(agent.name),
                                name: agent.name,
                              }),
                      })),
                    ]}
                    ariaLabel={t("org.staff.linkExisting")}
                    className="office-dept-staff-link-select"
                    size="sm"
                  />
                  <Button
                    size="sm"
                    disabled={!linkAgentName || linking}
                    onClick={() => void linkExisting()}
                  >
                    {linking ? t("org.staff.linking") : t("org.staff.linkCta")}
                  </Button>
                  {linkError ? <p className="office-dept-staff-link-error">{linkError}</p> : null}
                </div>
              ) : (
                <p className="office-empty">{t("org.staff.incorporateEmpty")}</p>
              )}
            </div>
          ) : (
            <div className="office-dept-staff-assistant">
              <h3 className="office-dept-staff-assistant-title">{t("org.staff.createTitle")}</h3>
              <p className="office-dept-extra-desc">{t("org.staff.createHint")}</p>
              <div className="office-dept-staff-assistant-actions">
                {missing.length > 0 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openAssistant(buildGapBrief(orgUnitName, missing))}
                  >
                    {t("org.staff.suggestMissing")}
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openAssistant(buildExpandBrief(orgUnitName, orgUnitType))}
                >
                  {t("org.staff.addNewRole")}
                </Button>
              </div>
              <CatalogStudioAgentPanel
                key={assistantKey}
                embedded
                initialBrief={brief}
                initialOrgUnitId={orgUnitId}
                onApplied={() => {
                  onRefresh?.();
                  setBrief("");
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
