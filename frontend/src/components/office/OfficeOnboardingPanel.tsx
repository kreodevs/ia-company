import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { OfficeDashboard } from "../../lib/api";

const STORAGE_KEY = "ac.office-onboarding-v1";

export function isOfficeOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissOfficeOnboarding(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowOfficeOnboarding(dashboard: OfficeDashboard): boolean {
  if (isOfficeOnboardingDismissed()) return false;
  const noAgents = dashboard.stats.agentsTotal < 1;
  const noActivity = dashboard.activity.length === 0;
  return noAgents || noActivity;
}

interface OfficeOnboardingPanelProps {
  dashboard: OfficeDashboard;
  onDismiss: () => void;
}

export default function OfficeOnboardingPanel({ dashboard, onDismiss }: OfficeOnboardingPanelProps) {
  const { t } = useTranslation();

  const steps = [
    {
      id: "team",
      done: dashboard.stats.agentsTotal >= 1,
      titleKey: "office.onboarding.stepTeam",
      descKey: "office.onboarding.stepTeamDesc",
      to: "/ai-team",
    },
    {
      id: "dept",
      done: false,
      titleKey: "office.onboarding.stepDept",
      descKey: "office.onboarding.stepDeptDesc",
      to: "/org-studio",
    },
    {
      id: "task",
      done: dashboard.activity.some(
        (a) => a.type === "run_completed" || a.type === "run_active",
      ),
      titleKey: "office.onboarding.stepTask",
      descKey: "office.onboarding.stepTaskDesc",
      to: "#office-coordinator-chat",
    },
  ] as const;

  return (
    <section
      className="office-onboarding mb-6 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4 md:p-5"
      aria-labelledby="office-onboarding-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="office-onboarding-title" className="text-base font-semibold">
            {t("office.onboarding.title")}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {t("office.onboarding.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-[var(--color-muted-foreground)] underline hover:text-[var(--color-foreground)]"
        >
          {t("office.onboarding.dismiss")}
        </button>
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3 text-sm">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                step.done
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border border-[var(--color-border)] bg-[var(--color-background)]"
              }`}
              aria-hidden
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t(step.titleKey)}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{t(step.descKey)}</p>
              {!step.done && (
                <Link
                  to={step.to}
                  className="mt-1 inline-block text-xs text-[var(--color-primary)] underline"
                >
                  {t("office.onboarding.startStep")}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
