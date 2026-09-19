import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { translateApiError } from "../../lib/translate-error";
import { toast } from "../molecules/Sonner";
import Panel from "../ui/Panel";
import Input from "../ui/Input";
import Button from "../ui/Button";

type ChangePasswordVariant = "superadmin" | "tenant";

interface ChangePasswordPanelProps {
  variant: ChangePasswordVariant;
  email: string;
  name?: string;
}

export default function ChangePasswordPanel({ variant, email, name }: ChangePasswordPanelProps) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("auth.changePassword.passwordsDoNotMatch"));
      return;
    }

    setSaving(true);
    try {
      if (variant === "superadmin") {
        await api.auth.changePassword({ currentPassword, password });
      } else {
        await api.auth.changeTenantPassword({ currentPassword, password });
      }
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      toast.success(t("auth.changePassword.success"));
    } catch (err) {
      toast.error(translateApiError(err, t, "auth.changePassword.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title={t("auth.changePassword.title")} subtitle={t("auth.changePassword.subtitle")} bodySize="sm">
      <div className="mb-4 space-y-1 text-sm">
        {name ? <p className="font-medium">{name}</p> : null}
        <p className="text-[var(--color-muted-foreground)]">{email}</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-md space-y-4">
        <Input
          label={t("auth.changePassword.currentPassword")}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          label={t("auth.changePassword.newPassword")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <Input
          label={t("auth.changePassword.confirmPassword")}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <Button type="submit" disabled={saving}>
          {saving ? t("common.saving") : t("auth.changePassword.updatePassword")}
        </Button>
      </form>
    </Panel>
  );
}
