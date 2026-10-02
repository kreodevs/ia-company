/**
 * Planner de sesiones para workflows migrados al runtime de Office.
 * Calcula ondas topológicas: cada onda puede ejecutarse en paralelo y no
 * comienza hasta que todos sus predecesores de ondas hayan terminado.
 */

export interface PlannerStep {
  id: string;
  agentId: string;
  agentName: string;
  stepOrder: number;
}

export interface PlannerEdge {
  sourceStepId: string;
  targetStepId: string;
}

export interface SessionExecutionWave {
  wave: number;
  stepIds: string[];
  agentIds: string[];
  agentNames: string[];
}

export function buildSessionExecutionWaves(
  steps: PlannerStep[],
  edges: PlannerEdge[],
): SessionExecutionWave[] {
  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const byId = new Map(ordered.map((step) => [step.id, step]));
  const incoming = new Map<string, string[]>();
  for (const step of ordered) incoming.set(step.id, []);
  for (const edge of edges) {
    if (byId.has(edge.sourceStepId) && byId.has(edge.targetStepId)) {
      incoming.get(edge.targetStepId)!.push(edge.sourceStepId);
    }
  }

  const waveByStep = new Map<string, number>();
  const visiting = new Set<string>();
  const getWave = (stepId: string): number => {
    const cached = waveByStep.get(stepId);
    if (cached !== undefined) return cached;
    if (visiting.has(stepId)) throw new Error("Workflow contains a cycle; session planner requires a DAG");
    visiting.add(stepId);
    const parents = incoming.get(stepId) ?? [];
    const wave = parents.length ? Math.max(...parents.map(getWave)) + 1 : 0;
    visiting.delete(stepId);
    waveByStep.set(stepId, wave);
    return wave;
  };

  const grouped = new Map<number, PlannerStep[]>();
  for (const step of ordered) {
    const wave = getWave(step.id);
    const group = grouped.get(wave) ?? [];
    group.push(step);
    grouped.set(wave, group);
  }
  return [...grouped.entries()].sort(([a], [b]) => a - b).map(([wave, group]) => ({
    wave,
    stepIds: group.map((step) => step.id),
    agentIds: [...new Set(group.map((step) => step.agentId))],
    agentNames: [...new Set(group.map((step) => step.agentName))],
  }));
}

export function plannerMemory(waves: SessionExecutionWave[]): Record<string, unknown> {
  return {
    sessionPlanner: {
      strategy: "topological-waves",
      waves: waves.map(({ wave, stepIds, agentIds, agentNames }) => ({ wave, stepIds, agentIds, agentNames })),
    },
  };
}

export function plannerGoalSuffix(wave: number, waves: SessionExecutionWave[]): string {
  const previous = waves.filter((item) => item.wave < wave).flatMap((item) => item.agentNames);
  return previous.length
    ? `This is wave ${wave}. Review the handoffs left by prior waves (${previous.join(", ")}) before making decisions.`
    : `This is wave ${wave}, the first execution wave. Establish the factual baseline for downstream agents.`;
}
