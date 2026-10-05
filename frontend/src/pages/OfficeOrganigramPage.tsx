import { useTranslation } from "react-i18next";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { OrganigramMap } from "../components/office/OrganigramMap";

export const OfficeOrganigramPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageFrame width="office">
      <PageHeader
        variant="command"
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("office.title"), to: "/office" },
              { label: t("nav.organigram") },
            ]}
          />
        }
        title={t("office.pages.organigram.title")}
        subtitle={t("office.pages.organigram.subtitle")}
      />
      <OrganigramMap />
    </PageFrame>
  );
};
