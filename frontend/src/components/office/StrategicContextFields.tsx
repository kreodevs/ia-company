import { useEffect, useMemo, useState } from "react";
import { getInitiatives, getObjectives, type CompanyGoal, type Initiative } from "../../lib/api";
import { Label } from "@/components/atoms/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select";

export interface StrategicContextValue {
  companyGoalId: string | null;
  initiativeId: string | null;
}

interface StrategicContextFieldsProps {
  value: StrategicContextValue;
  onChange: (value: StrategicContextValue) => void;
  className?: string;
}

/**
 * Selector opcional objetivo → iniciativa al crear un encargo (Fase F / P6).
 */
export function StrategicContextFields({ value, onChange, className }: StrategicContextFieldsProps) {
  const [goals, setGoals] = useState<CompanyGoal[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  useEffect(() => {
    void getObjectives().then(setGoals).catch(() => setGoals([]));
    void getInitiatives().then(setInitiatives).catch(() => setInitiatives([]));
  }, []);

  const initiativesForGoal = useMemo(
    () =>
      value.companyGoalId
        ? initiatives.filter((i) => i.companyGoalId === value.companyGoalId)
        : [],
    [initiatives, value.companyGoalId],
  );

  return (
    <div className={className ?? "space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3"}>
      <p className="text-sm text-[var(--foreground-muted)]">
        ¿A qué objetivo o iniciativa contribuye este encargo? (opcional)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="strategic-goal">Objetivo</Label>
          <Select
            value={value.companyGoalId ?? "__none__"}
            onValueChange={(next) => {
              const companyGoalId = next === "__none__" ? null : next;
              onChange({ companyGoalId, initiativeId: null });
            }}
          >
            <SelectTrigger id="strategic-goal" className="w-full">
              <SelectValue placeholder="Sin objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin objetivo</SelectItem>
              {goals.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="strategic-initiative">Iniciativa</Label>
          <Select
            value={value.initiativeId ?? "__none__"}
            disabled={!value.companyGoalId}
            onValueChange={(next) => {
              onChange({
                companyGoalId: value.companyGoalId,
                initiativeId: next === "__none__" ? null : next,
              });
            }}
          >
            <SelectTrigger id="strategic-initiative" className="w-full">
              <SelectValue placeholder="Sin iniciativa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin iniciativa</SelectItem>
              {initiativesForGoal.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
