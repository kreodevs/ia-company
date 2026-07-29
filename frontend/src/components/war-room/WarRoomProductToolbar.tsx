import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TenantProduct } from "../../lib/api";
import Select from "../ui/Select";
import { WAR_ROOM_GENERAL_VALUE } from "./war-room-shared";

interface WarRoomProductToolbarProps {
  products: TenantProduct[];
  focusProductId: string | null;
  selectedValue: string;
  onSelect: (value: string) => void;
  runQuery?: string;
}

export default function WarRoomProductToolbar({
  products,
  focusProductId,
  selectedValue,
  onSelect,
  runQuery = "",
}: WarRoomProductToolbarProps) {
  const { t } = useTranslation();

  const selectOptions = useMemo(
    () => [
      {
        value: WAR_ROOM_GENERAL_VALUE,
        label: t("warRoom.general.allProducts"),
      },
      ...products.map((product) => ({
        value: product.id,
        label:
          product.id === focusProductId
            ? `${product.name} (${t("warRoom.focused")})`
            : product.name,
      })),
    ],
    [products, focusProductId, t],
  );

  return (
    <div className="war-room-toolbar">
      <label htmlFor="war-room-product" className="war-room-toolbar-label">
        {t("warRoom.selectProduct")}
      </label>
      <Select
        id="war-room-product"
        value={selectedValue}
        onChange={onSelect}
        options={selectOptions}
        ariaLabel={t("warRoom.selectProduct")}
        className="war-room-toolbar-select"
        size="sm"
      />
      {selectedValue !== WAR_ROOM_GENERAL_VALUE && (
        <Link to={`/war-room${runQuery}`} className="war-room-toolbar-back">
          {t("warRoom.general.backToGeneral")}
        </Link>
      )}
      <Link to="/products" className="war-room-toolbar-link">
        {t("warRoom.manageProducts")}
      </Link>
    </div>
  );
}
