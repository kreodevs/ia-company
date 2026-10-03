import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type EncargoActivityItem } from "../../lib/api";

interface Props {
  runId: string;
}

const CATEGORY_CLASS: Record<EncargoActivityItem["category"], string> = {
  technical: "office-activity-item--technical",
  governance: "office-activity-item--governance",
  business: "office-activity-item--business",
};

export default function EncargoActivityTimeline({ runId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<EncargoActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.office
      .activity(runId)
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (loading) {
    return <p className="office-activity-loading">{t("office.activity.loading")}</p>;
  }

  if (items.length === 0) {
    return <p className="office-activity-empty">{t("office.activity.empty")}</p>;
  }

  return (
    <ol className="office-activity-timeline">
      {items.map((entry) => (
        <li key={entry.id} className={`office-activity-item ${CATEGORY_CLASS[entry.category]}`}>
          <span className="office-activity-dot" aria-hidden />
          <div className="office-activity-body">
            <div className="office-activity-head">
              <span className="office-activity-kind">{entry.kind}</span>
              <span className="office-activity-title">{entry.title}</span>
              <time className="office-activity-time" dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleString()}
              </time>
            </div>
            {entry.detail ? <p className="office-activity-detail">{entry.detail}</p> : null}
            {entry.actor ? <span className="office-activity-actor">{entry.actor}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
