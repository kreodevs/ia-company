import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DollarSign, Users } from "lucide-react";
import type { ProductMetricsSnapshot } from "../../lib/api";

export interface ProductMetricsStripProps {
  metrics: ProductMetricsSnapshot | null | undefined;
  productId: string;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ProductMetricsStrip({ metrics, productId }: ProductMetricsStripProps) {
  const { t } = useTranslation();

  if (!metrics) return null;

  const revenueLive = metrics.stripeWebhookConfigured && metrics.revenueEventCount > 0;
  const waitlistLive = metrics.waitlistCount > 0;

  return (
    <section className="product-metrics mb-4" aria-label={t("warRoom.metrics.aria")}>
      <div className="product-metrics__card">
        <DollarSign className="h-4 w-4 shrink-0 product-metrics__icon" aria-hidden />
        <div className="min-w-0">
          <p className="product-metrics__label">{t("warRoom.metrics.revenue")}</p>
          <p className="product-metrics__value">{formatUsd(metrics.revenueUsd)}</p>
          <p className="product-metrics__meta">
            {revenueLive
              ? t("warRoom.metrics.revenueLive", {
                  count: metrics.revenueEventCount,
                  source: metrics.revenueSource ?? "stripe",
                })
              : metrics.stripeWebhookConfigured
                ? t("warRoom.metrics.revenueReady")
                : t("warRoom.metrics.revenueManual")}
          </p>
        </div>
      </div>

      <div className="product-metrics__card">
        <Users className="h-4 w-4 shrink-0 product-metrics__icon" aria-hidden />
        <div className="min-w-0">
          <p className="product-metrics__label">{t("warRoom.metrics.waitlist")}</p>
          <p className="product-metrics__value">{metrics.waitlistCount}</p>
          <p className="product-metrics__meta">
            {waitlistLive
              ? t("warRoom.metrics.waitlistLive", {
                  date: metrics.waitlistLastSignupAt
                    ? new Date(metrics.waitlistLastSignupAt).toLocaleDateString()
                    : "—",
                })
              : t("warRoom.metrics.waitlistEmpty")}
          </p>
        </div>
      </div>

      <p className="product-metrics__link">
        <Link to={`/products/${productId}/settings?tab=revenue`}>{t("warRoom.metrics.configure")}</Link>
      </p>
    </section>
  );
}
