import type { TFunction } from "i18next";
import type { OfficeEncargoSummary } from "../lib/api";
import { agentDisplayLabel } from "./office-visual";

export const VIRTUAL_DEPARTMENT_SLUGS = ["strategy", "product", "engineering", "business"] as const;

export function encargoDepartmentLabel(item: OfficeEncargoSummary, t: TFunction): string {
  if (item.orgUnitName) return item.orgUnitName;
  if (item.departmentSlug) {
    return t(`office.departments.${item.departmentSlug}.name` as "office.departments.strategy.name");
  }
  return t("office.encargos.noDepartment");
}

export function encargoDepartmentLabelFromParts(
  input: {
    departmentSlug?: string | null;
    orgUnitName?: string | null;
  },
  t: TFunction,
): string {
  if (input.orgUnitName) return input.orgUnitName;
  if (input.departmentSlug) {
    return t(`office.departments.${input.departmentSlug}.name` as "office.departments.strategy.name");
  }
  return t("office.encargos.noDepartment");
}

export function encargoContextLine(
  input: {
    procedureLabel?: string | null;
    departmentSlug?: string | null;
    orgUnitName?: string | null;
  },
  t: TFunction,
): string {
  const dept = encargoDepartmentLabelFromParts(input, t);
  const procedure = input.procedureLabel?.trim();
  if (procedure) return `${dept} → ${procedure}`;
  return dept;
}

export function encargoTeamLabels(
  teamAgents: string[],
  t: TFunction,
): string {
  return teamAgents
    .map((name) => agentDisplayLabel({ name, role: null }, t))
    .join(" · ");
}
