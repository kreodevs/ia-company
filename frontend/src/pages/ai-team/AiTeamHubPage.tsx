import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AgentsPage from "../AgentsPage";
import SkillsPage from "../SkillsPage";
import PageHeader from "../../components/ui/PageHeader";
import TabsBar from "../../components/ui/TabsBar";
import CatalogStudioAgentPanel from "../../components/catalog-studio/CatalogStudioAgentPanel";
import CatalogStudioSkillPanel from "../../components/catalog-studio/CatalogStudioSkillPanel";

type AiTeamTab = "agents" | "skills" | "create-agent" | "create-skill";

function parseTab(raw: string | null): AiTeamTab {
  if (raw === "skills" || raw === "create-agent" || raw === "create-skill") return raw;
  return "agents";
}

export default function AiTeamHubPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const createAgentBrief = searchParams.get("brief") ?? "";
  const createAgentOrgUnitId = searchParams.get("orgUnitId") ?? "";

  const setTab = (tab: AiTeamTab) => {
    setSearchParams(tab === "agents" ? {} : { tab });
  };

  const tabs = [
    { id: "agents", label: t("catalogStudio.tabs.agents") },
    { id: "skills", label: t("catalogStudio.tabs.skills") },
    { id: "create-agent", label: t("catalogStudio.tabs.createAgent") },
    { id: "create-skill", label: t("catalogStudio.tabs.createSkill") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("catalogStudio.title")} subtitle={t("catalogStudio.subtitle")} />
      <TabsBar tabs={tabs} activeId={activeTab} onChange={(id: string) => setTab(id as AiTeamTab)} />

      {activeTab === "agents" && <AgentsPage embedded />}
      {activeTab === "skills" && <SkillsPage embedded />}
      {activeTab === "create-agent" && (
        <CatalogStudioAgentPanel
          initialBrief={createAgentBrief}
          initialOrgUnitId={createAgentOrgUnitId}
        />
      )}
      {activeTab === "create-skill" && <CatalogStudioSkillPanel />}
    </div>
  );
}
