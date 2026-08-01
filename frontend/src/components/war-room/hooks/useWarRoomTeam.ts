import { useCallback, useEffect, useRef, useState } from "react";
import { api, type TeamActiveRun, TeamAgent, TeamActiveRunSummary, TeamRecentRun } from "../../../lib/api";
import {
  createTeamRefreshScheduler,
  STEP_EVENT_REFRESH_MS,
  useHeldAgentTeam,
  useWarRoomHandoff,
  warRoomUsesStreamRefresh,
  type WarRoomHandoffState,
} from "../../../lib/war-room-live";

export interface WarRoomTeamSnapshot {
  team: TeamAgent[];
  activeRun: TeamActiveRun | null;
  activeRuns?: TeamActiveRunSummary[];
  recentRuns?: TeamRecentRun[];
}

export const WAR_ROOM_POLL_MS = {
  delegated: 8000,
  awaitingUser: 12000,
  default: 12000,
} as const;

const STREAM_STATUSES = new Set(["RUNNING", "PENDING", "DELEGATED", "AWAITING_USER"]);

export function warRoomPollIntervalMs(status: string | undefined): number {
  if (status === "DELEGATED") return WAR_ROOM_POLL_MS.delegated;
  if (status === "AWAITING_USER") return WAR_ROOM_POLL_MS.awaitingUser;
  return WAR_ROOM_POLL_MS.default;
}

export interface UseWarRoomTeamOptions {
  /** Surface SSE log snippets in the tactical core (product war room). */
  enableLiveNotes?: boolean;
  enabled?: boolean;
}

export interface UseWarRoomTeamResult<T extends WarRoomTeamSnapshot> {
  data: T | null;
  loading: boolean;
  error: string | null;
  displayTeam: TeamAgent[];
  handoff: WarRoomHandoffState | null;
  liveNote: string | null;
  refresh: () => Promise<T | null>;
  scheduleRefresh: (minIntervalMs?: number) => void;
  flushRefresh: () => void;
  retry: () => void;
}

export function useWarRoomTeam<T extends WarRoomTeamSnapshot>(
  fetchTeam: () => Promise<T | null>,
  scopeKey: string,
  watchRunId?: string | null,
  options: UseWarRoomTeamOptions = {},
): UseWarRoomTeamResult<T> {
  const { enableLiveNotes = false, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teamRef = useRef<TeamAgent[]>([]);
  const skipWatchRunRefresh = useRef(true);

  const flashNote = useCallback((note: string) => {
    if (!enableLiveNotes) return;
    setLiveNote(note);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setLiveNote(null), 4000);
  }, [enableLiveNotes]);

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    try {
      const fresh = await fetchTeam();
      setData(fresh);
      setError(null);
      teamRef.current = fresh?.team ?? [];
      return fresh;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
      teamRef.current = [];
      return null;
    }
  }, [enabled, fetchTeam]);

  const refreshScheduler = useRef(createTeamRefreshScheduler(() => refresh()));
  const { handoff, bindStreamHandler } = useWarRoomHandoff(data?.activeRun?.id, () =>
    refreshScheduler.current.schedule(STEP_EVENT_REFRESH_MS),
  );

  useEffect(() => {
    refreshScheduler.current = createTeamRefreshScheduler(() => refresh());
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    skipWatchRunRefresh.current = true;
    setLoading(true);
    setData(null);
    setError(null);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => refreshScheduler.current.dispose();
  }, [enabled, scopeKey, refresh]);

  useEffect(() => {
    if (!enabled || loading) return;
    if (skipWatchRunRefresh.current) {
      skipWatchRunRefresh.current = false;
      return;
    }
    void refresh().catch(() => undefined);
  }, [enabled, watchRunId, loading, refresh]);

  useEffect(() => {
    const active = data?.activeRun;
    if (!active || warRoomUsesStreamRefresh(active.status)) return;

    const intervalMs = warRoomPollIntervalMs(active.status);
    const timer = window.setInterval(
      () => refreshScheduler.current.schedule(intervalMs),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [data?.activeRun?.id, data?.activeRun?.status]);

  useEffect(() => {
    const active = data?.activeRun;
    if (!active || !STREAM_STATUSES.has(active.status)) return;

    const close = api.runs.streamLogs(active.id, bindStreamHandler((evt) => {
      const event = evt as { type?: string; data?: { agentId?: string | null; message?: string } };
      if (enableLiveNotes && event.type === "log" && event.data?.agentId) {
        const agent = teamRef.current.find((entry) => entry.id === event.data?.agentId);
        const preview = String(event.data?.message ?? "").slice(0, 80);
        if (preview) flashNote(agent ? `${agent.name}: ${preview}` : preview);
      } else if (event.type === "done") {
        refreshScheduler.current.flush();
      }
    }));
    return () => close();
  }, [data?.activeRun?.id, data?.activeRun?.status, bindStreamHandler, enableLiveNotes, flashNote]);

  const displayTeam = useHeldAgentTeam(data?.team ?? []);

  const retry = useCallback(() => {
    setLoading(true);
    void refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  const scheduleRefresh = useCallback((minIntervalMs?: number) => {
    refreshScheduler.current.schedule(minIntervalMs);
  }, []);

  const flushRefresh = useCallback(() => {
    refreshScheduler.current.flush();
  }, []);

  return {
    data,
    loading,
    error,
    displayTeam,
    handoff,
    liveNote: enableLiveNotes ? liveNote : null,
    refresh,
    scheduleRefresh,
    flushRefresh,
    retry,
  };
}
