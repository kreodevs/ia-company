import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pause, Play, Archive, XCircle, Ban, Trash2 } from "lucide-react";
import { api, type ProductPhase, type TenantProduct } from "../../lib/api";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";

type Action = "pause" | "resume" | "archive" | "noGo" | "cancel" | "delete";

export interface ProductActionsMenuProps {
  product: TenantProduct;
  onChange?: () => void;
}

export default function ProductActionsMenu({ product, onChange }: ProductActionsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClickAway);
    return () => window.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const isArchived = product.phase === "archived";
  const isPaused = product.phase === "paused";

  const availableActions = useMemo(() => {
    if (isArchived) return [] as Action[];
    const actions: Action[] = [];
    if (!isPaused) actions.push("pause");
    if (isPaused) actions.push("resume");
    if (product.goNoGo !== "no_go") actions.push("noGo");
    actions.push("cancel", "delete", "archive");
    return actions;
  }, [isArchived, isPaused, product.goNoGo]);

  const runAction = async (action: Action) => {
    setBusy(true);
    setError(null);
    try {
      if (action === "cancel") {
        await api.products.cancel(product.id);
      } else if (action === "delete") {
        await api.products.delete(product.id);
      } else {
        const phase: ProductPhase | undefined =
          action === "pause" ? "paused"
          : action === "resume" ? "building"
          : action === "archive" ? "archived"
          : undefined;
        const goNoGo = action === "noGo" ? "no_go" : undefined;
        await api.products.update(product.id, {
          ...(phase ? { phase } : {}),
          ...(goNoGo ? { goNoGo } : {}),
        });
      }
      setPendingAction(null);
      setOpen(false);
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (isArchived) {
    return (
      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {t("products.actions.archivedBadge")}
      </span>
    );
  }

  const confirmCopy: Record<
    Action,
    { titleKey: string; descKey: string; confirmKey: string; destructive: boolean }
  > = {
    pause: {
      titleKey: "products.actions.pauseTitle",
      descKey: "products.actions.pauseDescription",
      confirmKey: "products.actions.pause",
      destructive: false,
    },
    resume: {
      titleKey: "products.actions.resumeTitle",
      descKey: "products.actions.resumeDescription",
      confirmKey: "products.actions.resume",
      destructive: false,
    },
    archive: {
      titleKey: "products.actions.archiveTitle",
      descKey: "products.actions.archiveDescription",
      confirmKey: "products.actions.archive",
      destructive: true,
    },
    noGo: {
      titleKey: "products.actions.noGoTitle",
      descKey: "products.actions.noGoDescription",
      confirmKey: "products.actions.noGo",
      destructive: true,
    },
    cancel: {
      titleKey: "products.active.cancelTitle",
      descKey: "products.active.cancelDescription",
      confirmKey: "products.actions.cancelAndArchive",
      destructive: true,
    },
    delete: {
      titleKey: "products.actions.deleteProductTitle",
      descKey: "products.actions.deleteProductDescription",
      confirmKey: "products.actions.deleteProduct",
      destructive: true,
    },
  };

  const activeCopy = pendingAction ? confirmCopy[pendingAction] : null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="!min-h-9 !px-2"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
        <span className="sr-only">{t("products.actions.menu")}</span>
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] py-1 shadow-xl"
        >
          {availableActions.includes("pause") && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPendingAction("pause");
                setOpen(false);
              }}
              className="interactive flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface)]"
            >
              <Pause className="h-3.5 w-3.5" aria-hidden />
              {t("products.actions.pause")}
            </button>
          )}
          {availableActions.includes("resume") && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPendingAction("resume");
                setOpen(false);
              }}
              className="interactive flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface)]"
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              {t("products.actions.resume")}
            </button>
          )}
          {availableActions.includes("noGo") && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPendingAction("noGo");
                setOpen(false);
              }}
              className="interactive flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              {t("products.actions.markNoGo")}
            </button>
          )}
          {availableActions.includes("cancel") && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPendingAction("cancel");
                setOpen(false);
              }}
              className="interactive flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
            >
              <Ban className="h-3.5 w-3.5" aria-hidden />
              {t("products.actions.cancelAndArchive")}
            </button>
          )}
          {availableActions.includes("delete") && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPendingAction("delete");
                setOpen(false);
              }}
              className="interactive flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {t("products.actions.deleteProduct")}
            </button>
          )}
          {availableActions.includes("archive") && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPendingAction("archive");
                setOpen(false);
              }}
              className="interactive flex w-full items-center gap-2 border-t border-[var(--color-border)] px-3 py-2 text-left text-sm text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
            >
              <Archive className="h-3.5 w-3.5" aria-hidden />
              {t("products.actions.archive")}
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title={activeCopy ? t(activeCopy.titleKey, { name: product.name }) : ""}
        description={activeCopy ? t(activeCopy.descKey, { name: product.name }) : ""}
        confirmLabel={activeCopy ? t(activeCopy.confirmKey) : undefined}
        destructive={activeCopy?.destructive}
        busy={busy}
        onCancel={() => (busy ? undefined : setPendingAction(null))}
        onConfirm={() => {
          if (pendingAction) void runAction(pendingAction);
        }}
      />

      {error && (
        <p className="absolute right-0 z-30 mt-2 w-56 rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-2 py-1 text-xs text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}