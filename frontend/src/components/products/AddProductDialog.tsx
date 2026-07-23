import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FolderOpen, Plus } from "lucide-react";
import { api, type ProductPhase, type TenantProduct } from "../../lib/api";
import { translateApiError } from "../../lib/translate-error";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

type AddMode = "register" | "bootstrap";

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: TenantProduct, mode: AddMode) => void;
}

export default function AddProductDialog({ open, onClose, onCreated }: AddProductDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<AddMode>("register");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<ProductPhase>("building");
  const [focusAfter, setFocusAfter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importable, setImportable] = useState<
    Array<{ slug: string; path: string; hasCode: boolean }>
  >([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void api.products.importable().then((res) => setImportable(res.workspaces));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handler);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", handler);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugifyName(name));
    }
  }, [name, slugTouched]);

  const phaseOptions = useMemo(
    () =>
      (["queued", "building", "launching", "growing", "paused"] as ProductPhase[]).map((p) => ({
        value: p,
        label: t(`products.active.phase.${p}`, { defaultValue: p }),
      })),
    [t],
  );

  const reset = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setPhase("building");
    setFocusAfter(true);
    setMode("register");
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const pickImportable = (item: { slug: string; path: string }) => {
    setMode("register");
    setSlug(item.slug);
    setSlugTouched(true);
    if (!name.trim()) {
      setName(
        item.slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      );
    }
  };

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();
    if (!trimmedName || !trimmedSlug) {
      setError(t("products.add.validationRequired"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let product: TenantProduct;
      if (mode === "register") {
        const result = await api.products.register({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || undefined,
          phase,
        });
        product = result.product;
      } else {
        product = await api.products.bootstrap({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || undefined,
        });
      }

      if (focusAfter) {
        await api.products.focus(product.id);
      }

      onCreated(product, mode);
      reset();
      onClose();
    } catch (err) {
      setError(translateApiError(err, t, "products.add.failed"));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-product-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-2xl"
      >
        <h2 id="add-product-title" className="text-lg font-semibold">
          {t("products.add.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {t("products.add.subtitle")}
        </p>

        <div className="mt-4 flex gap-1 rounded-lg border border-[var(--color-border)] p-1">
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`interactive flex-1 rounded-md px-3 py-2 text-xs font-medium ${
              mode === "register"
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            {t("products.add.modeRegister")}
          </button>
          <button
            type="button"
            onClick={() => setMode("bootstrap")}
            className={`interactive flex-1 rounded-md px-3 py-2 text-xs font-medium ${
              mode === "bootstrap"
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            {t("products.add.modeBootstrap")}
          </button>
        </div>

        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          {mode === "register" ? t("products.add.registerHint") : t("products.add.bootstrapHint")}
        </p>

        {mode === "register" && importable.length > 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-[var(--color-border)] p-3">
            <p className="mb-2 text-xs font-medium">{t("products.add.importableTitle")}</p>
            <ul className="space-y-1">
              {importable.map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => pickImportable(item)}
                    className="interactive flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--color-surface)]"
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-hidden />
                    <span className="font-mono text-xs">{item.path}</span>
                    {item.hasCode && (
                      <span className="ml-auto text-[10px] uppercase text-[var(--color-muted-foreground)]">
                        {t("products.add.hasCode")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <Input
            label={t("products.add.nameLabel")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("products.add.namePlaceholder")}
            disabled={busy}
          />
          <div>
            <Input
              label={t("products.add.slugLabel")}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="mi-producto"
              disabled={busy}
            />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {t("products.add.slugHint", { path: slug ? `projects/${slug}/` : "projects/{slug}/" })}
            </p>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("products.add.descriptionLabel")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={busy}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              placeholder={t("products.add.descriptionPlaceholder")}
            />
          </label>
          {mode === "register" && (
            <div>
              <label htmlFor="add-product-phase" className="mb-1 block text-sm font-medium">
                {t("products.add.phaseLabel")}
              </label>
              <Select
                id="add-product-phase"
                value={phase}
                onChange={(v) => setPhase(v as ProductPhase)}
                options={phaseOptions}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={focusAfter}
              onChange={(e) => setFocusAfter(e.target.checked)}
              disabled={busy}
              className="rounded border-[var(--color-border)]"
            />
            {t("products.add.focusAfter")}
          </label>
        </div>

        {error && (
          <p className="mt-3 text-sm text-[var(--color-destructive)]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {mode === "register" ? t("products.add.submitRegister") : t("products.add.submitBootstrap")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
