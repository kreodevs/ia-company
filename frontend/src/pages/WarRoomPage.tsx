import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type TenantProduct } from "../lib/api";
import WarRoomContent from "../components/war-room/WarRoomContent";
import PageLoading from "../components/ui/PageLoading";
import Select from "../components/ui/Select";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";

export default function WarRoomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { productId } = useParams<{ productId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const watchRunId = searchParams.get("run");
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [focusProductId, setFocusProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.products
      .overview()
      .then((overview) => {
        setProducts(overview.products);
        setFocusProductId(overview.focusProduct?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const defaultProductId = focusProductId ?? products[0]?.id ?? null;

  useEffect(() => {
    if (loading || productId || !defaultProductId) return;
    const runSuffix = watchRunId ? `?run=${encodeURIComponent(watchRunId)}` : "";
    navigate(`/war-room/${defaultProductId}${runSuffix}`, { replace: true });
  }, [loading, productId, defaultProductId, navigate, watchRunId]);

  const handleWatchRunChange = (runId: string | null) => {
    if (runId) {
      setSearchParams({ run: runId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const runQuery = watchRunId ? `?run=${encodeURIComponent(watchRunId)}` : "";

  const selectOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label:
          product.id === focusProductId
            ? `${product.name} (${t("warRoom.focused")})`
            : product.name,
      })),
    [products, focusProductId, t],
  );

  if (loading) {
    return <PageLoading message={t("warRoom.loading")} />;
  }

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <EmptyState
          title={t("warRoom.noProductsTitle")}
          description={t("warRoom.noProductsHint")}
          action={
            <Link to="/products">
              <Button>{t("nav.products")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const selectedId = productId ?? defaultProductId;
  if (!selectedId) {
    return <PageLoading message={t("warRoom.loading")} />;
  }

  if (productId && !products.some((product) => product.id === productId)) {
    return <Navigate to="/war-room" replace />;
  }

  return (
    <div className="war-room-page">
      <div className="war-room-toolbar">
        <label htmlFor="war-room-product" className="war-room-toolbar-label">
          {t("warRoom.selectProduct")}
        </label>
        <Select
          id="war-room-product"
          value={selectedId}
          onChange={(id) => navigate(`/war-room/${id}${runQuery}`)}
          options={selectOptions}
          ariaLabel={t("warRoom.selectProduct")}
          className="war-room-toolbar-select"
          size="sm"
        />
        <Link to="/products" className="war-room-toolbar-link">
          {t("warRoom.manageProducts")}
        </Link>
      </div>
      <WarRoomContent
        productId={selectedId}
        watchRunId={watchRunId}
        onWatchRunChange={handleWatchRunChange}
      />
    </div>
  );
}
