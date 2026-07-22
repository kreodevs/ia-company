import { Check, Circle, CircleDot } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CompanyPhase } from "../../lib/api";

export type FlowStepStatus = "done" | "current" | "upcoming";

export interface OpsFlowStep {
  id: string;
  label: string;
  hint: string;
  status: FlowStepStatus;
}

type FlowPhase = "exploring" | "validating" | "building" | "growing";

function normalizeFlowPhase(phase: CompanyPhase): FlowPhase {
  if (phase === "launching") return "building";
  return phase;
}

export function buildOpsFlowSteps(companyPhase: CompanyPhase): OpsFlowStep[] {
  const order: FlowPhase[] = ["exploring", "validating", "building", "growing"];
  const currentIndex = order.indexOf(normalizeFlowPhase(companyPhase));

  const labels: Record<FlowPhase, { label: string; hint: string }> = {
    exploring: { label: "ops.flow.step.discover", hint: "ops.flow.step.discoverHint" },
    validating: { label: "ops.flow.step.evaluate", hint: "ops.flow.step.evaluateHint" },
    building: { label: "ops.flow.step.build", hint: "ops.flow.step.buildHint" },
    growing: { label: "ops.flow.step.grow", hint: "ops.flow.step.growHint" },
  };

  return order.map((phase, index) => ({
    id: phase,
    label: labels[phase].label,
    hint: labels[phase].hint,
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
  }));
}

function StepIcon({ status }: { status: FlowStepStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
        <Check className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)]">
        <CircleDot className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted-foreground)]">
      <Circle className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

interface OpsFlowStepperProps {
  companyPhase: CompanyPhase;
}

export default function OpsFlowStepper({ companyPhase }: OpsFlowStepperProps) {
  const { t } = useTranslation();
  const steps = buildOpsFlowSteps(companyPhase);

  return (
    <section
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      aria-label={t("ops.flow.title")}
    >
      <h2 className="text-sm font-semibold">{t("ops.flow.title")}</h2>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t("ops.flow.subtitle")}</p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`relative rounded-lg border px-3 py-3 ${
              step.status === "current"
                ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)]"
            }`}
          >
            <div className="flex items-start gap-2">
              <StepIcon status={step.status} />
              <div className="min-w-0 space-y-1">
                <div className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  {t("ops.flow.stepNumber", { number: index + 1 })}
                </div>
                <div className="text-sm font-semibold">{t(step.label)}</div>
                <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                  {t(step.hint)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
