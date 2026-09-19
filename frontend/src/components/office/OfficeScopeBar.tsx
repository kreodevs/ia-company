import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type TenantProduct } from "../../lib/api";
import Select from "../ui/Select";
import { DEPARTMENT_SCOPE_GENERAL } from "./DepartmentRoomView";

export interface OfficeScopeBarProps {
  orgUnitId: string;
  onOrgUnitChange: (orgUnitId: string) => void;
  orgUnits: Array<{ id: string; name: string }>;
  productId: string;
  onProductChange: (productId: string) => void;
}

export default function OfficeScopeBar({
  orgUnitId,
  onOrgUnitChange,
  orgUnits,
  productId,
  onProductChange,
}: OfficeScopeBarProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [focusProductId, setFocusProductId] = useState<string | null>(null);

  useEffect(() => {
    api.products
      .overview()
      .then((overview) => {
        setProducts(overview.products);
        setFocusProductId(overview.focusProduct?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  const productOptions = useMemo(
    () => [
      {
        value: DEPARTMENT_SCOPE_GENERAL,
        label: t("office.task.scopeCompany"),
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

  const orgOptions = useMemo(
    () => [
      { value: "", label: t("office.task.orgUnitAny") },
      ...orgUnits.map((unit) => ({ value: unit.id, label: unit.name })),
    ],
    [orgUnits, t],
  );

  const selectedProduct = products.find((product) => product.id === productId) ?? null;
  const selectedOrg = orgUnits.find((unit) => unit.id === orgUnitId) ?? null;

  const scopeHint =
    productId !== DEPARTMENT_SCOPE_GENERAL && selectedProduct
      ? t("office.task.scopeProductHint", { name: selectedProduct.name })
      : orgUnitId && selectedOrg
        ? t("office.task.scopeOrgHint", { name: selectedOrg.name })
        : t("office.task.scopeCompanyHint");

  return (
    <div className="office-scope-bar">
      <div className="office-scope-bar-fields">
        <div className="office-scope-field">
          <label htmlFor="office-home-product-scope">{t("office.task.productLabel")}</label>
          <Select
            id="office-home-product-scope"
            value={productId}
            onChange={onProductChange}
            options={productOptions}
            ariaLabel={t("office.task.productLabel")}
            className="office-scope-select"
            size="sm"
          />
        </div>
        {orgUnits.length > 0 ? (
          <div className="office-scope-field">
            <label htmlFor="office-home-org-scope">{t("office.task.orgUnitLabel")}</label>
            <Select
              id="office-home-org-scope"
              value={orgUnitId}
              onChange={onOrgUnitChange}
              options={orgOptions}
              ariaLabel={t("office.task.orgUnitLabel")}
              className="office-scope-select"
              size="sm"
            />
          </div>
        ) : null}
      </div>
      <p className="office-scope-bar-hint">{scopeHint}</p>
    </div>
  );
}
