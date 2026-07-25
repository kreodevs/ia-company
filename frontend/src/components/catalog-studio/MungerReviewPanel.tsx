import type { StudioMungerReview } from "../../lib/catalog-studio-types";
import { useTranslation } from "react-i18next";
import Panel from "../ui/Panel";

interface MungerReviewPanelProps {
  review: StudioMungerReview;
}

export default function MungerReviewPanel({ review }: MungerReviewPanelProps) {
  const { t } = useTranslation();

  return (
    <Panel
      title={t("catalogStudio.mungerTitle")}
      bodySize="sm"
      subtitle={review.approved ? t("catalogStudio.mungerApproved") : t("catalogStudio.mungerVeto")}
    >
      <p className="text-sm whitespace-pre-wrap">{review.notes}</p>
      {review.veto && (
        <p className="mt-2 text-sm text-[var(--color-destructive)]">{review.veto.reason}</p>
      )}
    </Panel>
  );
}
