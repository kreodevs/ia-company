import { useEffect, useRef, useState } from "react";
import type { TeamAgent, TeamAgentStatus } from "./api";

/** Keep active agent states visible long enough to read the war-room table. */
export const AGENT_STATUS_HOLD_MS = 2800;
export const TEAM_REFRESH_MIN_MS = 2500;
export const STEP_EVENT_REFRESH_MS = TEAM_REFRESH_MIN_MS;

function statusPriority(status: TeamAgentStatus): number {
  if (status === "thinking") return 3;
  if (status === "queued") return 2;
  return 1;
}

export function useHeldAgentTeam<T extends TeamAgent>(team: T[]): T[] {
  const [display, setDisplay] = useState(team);
  const teamRef = useRef(team);
  teamRef.current = team;
  const holdsRef = useRef(
    new Map<string, { status: TeamAgentStatus; currentTask: string | null; releaseAt: number }>(),
  );
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setDisplay((prevDisplay) => {
      const now = Date.now();
      return team.map((agent) => {
        const prev = prevDisplay.find((entry) => entry.id === agent.id) ?? agent;
        const hold = holdsRef.current.get(agent.id);

        if (hold && now < hold.releaseAt) {
          if (statusPriority(agent.status) > statusPriority(hold.status)) {
            holdsRef.current.delete(agent.id);
            const timer = timersRef.current.get(agent.id);
            if (timer) clearTimeout(timer);
            timersRef.current.delete(agent.id);
            return agent;
          }
          return {
            ...agent,
            status: hold.status,
            currentTask: hold.currentTask ?? agent.currentTask,
          };
        }

        if (statusPriority(prev.status) > statusPriority(agent.status)) {
          const releaseAt = now + AGENT_STATUS_HOLD_MS;
          holdsRef.current.set(agent.id, {
            status: prev.status,
            currentTask: prev.currentTask,
            releaseAt,
          });
          const existing = timersRef.current.get(agent.id);
          if (existing) clearTimeout(existing);
          const agentId = agent.id;
          const timer = setTimeout(() => {
            timersRef.current.delete(agentId);
            holdsRef.current.delete(agentId);
            setDisplay((current) =>
              current.map((entry) =>
                entry.id === agentId
                  ? (teamRef.current.find((member) => member.id === agentId) ?? entry)
                  : entry,
              ),
            );
          }, AGENT_STATUS_HOLD_MS);
          timersRef.current.set(agent.id, timer);
          return {
            ...agent,
            status: prev.status,
            currentTask: prev.currentTask ?? agent.currentTask,
          };
        }

        return agent;
      });
    });
  }, [team]);

  useEffect(() => {
    if (team.length === 0) {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
      holdsRef.current.clear();
      setDisplay([]);
    }
  }, [team.length]);

  return display;
}

export function createTeamRefreshScheduler(refresh: () => Promise<unknown>) {
  let inFlight = false;
  let lastAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const run = async () => {
    if (disposed || inFlight) return;
    inFlight = true;
    try {
      await refresh();
      lastAt = Date.now();
    } catch {
      // Keep last good snapshot — rate limits should not blank the war room.
    } finally {
      inFlight = false;
    }
  };

  const schedule = (minIntervalMs = TEAM_REFRESH_MIN_MS) => {
    if (disposed) return;
    const elapsed = Date.now() - lastAt;
    if (timer) clearTimeout(timer);

    if (elapsed >= minIntervalMs && !inFlight) {
      void run();
      return;
    }

    timer = setTimeout(() => {
      timer = null;
      void run();
    }, Math.max(minIntervalMs - elapsed, 400));
  };

  const flush = () => {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = null;
    void run();
  };

  const dispose = () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return { schedule, flush, dispose };
}

export interface WarRoomHandoffState {
  fromAgentName: string | null;
  toAgentName: string | null;
  stepOrder: number | null;
}

export function useWarRoomHandoff(
  runId: string | null | undefined,
  onStepEvent?: () => void,
): {
  handoff: WarRoomHandoffState | null;
  bindStreamHandler: (
    handler: (evt: unknown) => void,
  ) => (evt: unknown) => void;
} {
  const [handoff, setHandoff] = useState<WarRoomHandoffState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHandoff(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [runId]);

  const bindStreamHandler =
    (handler: (evt: unknown) => void) =>
    (evt: unknown) => {
      handler(evt);
      const event = evt as { type?: string; data?: Record<string, unknown> };
      if (event.type === "step_start") {
        const agentName = typeof event.data?.agentName === "string" ? event.data.agentName : null;
        const stepOrder = typeof event.data?.stepOrder === "number" ? event.data.stepOrder : null;
        setHandoff((prev) => ({
          fromAgentName: prev?.toAgentName ?? null,
          toAgentName: agentName,
          stepOrder,
        }));
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setHandoff(null), AGENT_STATUS_HOLD_MS);
        onStepEvent?.();
      } else if (event.type === "step_complete") {
        onStepEvent?.();
      }
    };

  return { handoff, bindStreamHandler };
}

/** True when SSE log stream should drive refreshes instead of interval polling. */
export function warRoomUsesStreamRefresh(status: string | undefined): boolean {
  return status === "RUNNING" || status === "PENDING";
}
