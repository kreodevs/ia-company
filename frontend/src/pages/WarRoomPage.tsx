import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type TenantProduct } from "../lib/api";
import WarRoomContent from "../components/war-room/WarRoomContent";
import WarRoomGeneralContent from "../components/war-room/WarRoomGeneralContent";
import WarRoomProductToolbar from "../components/war-room/WarRoomProductToolbar";
import { WAR_ROOM_GENERAL_VALUE } from "../components/war-room/war-room-shared";
import PageLoading from "../components/ui/PageLoading";
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

  const handleWatchRunChange = (runId: string | null) => {
    if (runId) {
      setSearchParams({ run: runId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const runQuery = watchRunId ? `?run=${encodeURIComponent(watchRunId)}` : "";

  const handleProductSelect = (value: string) => {
    if (value === WAR_ROOM_GENERAL_VALUE) {
      navigate(`/war-room${runQuery}`);
      return;
    }
    navigate(`/war-room/${value}${runQuery}`);
  };

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

  if (productId && !products.some((product) => product.id === productId)) {
    return <Navigate to="/war-room" replace />;
  }

  const selectedValue = productId ?? WAR_ROOM_GENERAL_VALUE;

  return (
    <div className="war-room-page">
      <WarRoomProductToolbar
        products={products}
        focusProductId={focusProductId}
        selectedValue={selectedValue}
        onSelect={handleProductSelect}
        runQuery={runQuery}
      />
      {productId ? (
        <WarRoomContent
          productId={productId}
          watchRunId={watchRunId}
          onWatchRunChange={handleWatchRunChange}
        />
      ) : (
        <WarRoomGeneralContent products={products} watchRunId={watchRunId} />
      )}
    </div>
  );
}
