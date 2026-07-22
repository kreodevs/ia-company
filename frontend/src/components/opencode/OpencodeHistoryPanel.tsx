import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type ProductOpencodeHistory } from "../../lib/api";
import Card from "../ui/Card";

interface OpencodeHistoryPanelProps {
  productId: string;
}

export default function OpencodeHistoryPanel({ productId }: OpencodeHistoryPanelProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ProductOpencodeHistory | null>(null);

  useEffect(() => {
    void api.products.opencodeHistory(productId).then(setHistory).catch(() => setHistory(null));
  }, [productId]);

  if (!history || history.delegations.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t("opencode.history.title")}</h2>
      <ul className="space-y-2 text-sm">
        {history.delegations.slice(0, 8).map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium">{item.workflowName}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {item.status} · {item.diffCount} {t("opencode.history.files")}
              </p>
            </div>
            <Link to={`/runs/${item.runId}`} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              {t("opencode.history.viewRun")}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
