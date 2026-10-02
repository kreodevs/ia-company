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

export type WarRoomSessionEventKind =
  | "session_started"
  | "turn_started"
  | "tool_call"
  | "tool_result"
  | "file_changed"
  | "need_input"
  | "tool_approval"
  | "budget_exceeded"
  | "session_memory_updated"
  | "session_handoff"
  | "session_completed"
  | "session_failed"
  | "veto";

export interface WarRoomSessionActivityItem {
  id: string;
  kind: WarRoomSessionEventKind;
  sessionId: string | null;
  at: number;
  label: string;
  detail?: string | null;
  toolName?: string | null;
  path?: string | null;
  fileChanged?: boolean;
}

export interface WarRoomSessionState {
  items: WarRoomSessionActivityItem[];
  lastToolCall: { toolName: string; argsPreview: string | null; at: number } | null;
  lastFileChanged: { path: string | null; toolName: string | null; at: number } | null;
  needInputPrompt: string | null;
  pendingApproval: { toolName: string | null; reason: string } | null;
  budgetExceeded: { reason: string; spentTokens?: number; spentCostUsd?: number } | null;
  status: "idle" | "running" | "completed" | "failed" | "awaiting_input" | "awaiting_approval" | "budget_exceeded";
  summary: string | null;
  error: string | null;
  lastEventAt: number | null;
}

export const EMPTY_WAR_ROOM_SESSION_STATE: WarRoomSessionState = {
  items: [],
  lastToolCall: null,
  lastFileChanged: null,
  needInputPrompt: null,
  pendingApproval: null,
  budgetExceeded: null,
  status: "idle",
  summary: null,
  error: null,
  lastEventAt: null,
};

export interface UseWarRoomTeamResult<T extends WarRoomTeamSnapshot> {
  data: T | null;
  loading: boolean;
  error: string | null;
  displayTeam: TeamAgent[];
  handoff: WarRoomHandoffState | null;
  liveNote: string | null;
  session: WarRoomSessionState;
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
  const [session, setSession] = useState<WarRoomSessionState>(EMPTY_WAR_ROOM_SESSION_STATE);
  const [error, setError] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teamRef = useRef<TeamAgent[]>([]);
  const sessionEventSeq = useRef(0);
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
    setSession(EMPTY_WAR_ROOM_SESSION_STATE);
    sessionEventSeq.current = 0;
  }, [data?.activeRun?.id]);

  useEffect(() => {
    const active = data?.activeRun;
    if (!active || !STREAM_STATUSES.has(active.status)) return;

    const close = api.runs.streamLogs(active.id, bindStreamHandler((evt) => {
      const event = evt as { type?: string; data?: Record<string, unknown> };
      const payload = event.data ?? {};
      const sessionEvent = typeof payload.sessionEvent === "string" ? payload.sessionEvent : null;
      const gatewayKind = payload.kind === "tool_call" || payload.kind === "tool_result" ? payload.kind : null;

      if (enableLiveNotes && event.type === "log" && typeof payload.agentId === "string") {
        const agent = teamRef.current.find((entry) => entry.id === payload.agentId);
        const preview = String(payload.message ?? "").slice(0, 80);
        if (preview) flashNote(agent ? `${agent.name}: ${preview}` : preview);
      }

      if (sessionEvent || gatewayKind) {
        const kind = (sessionEvent ?? gatewayKind) as WarRoomSessionEventKind;
        const at = Date.now();
        const id = `${at}-${sessionEventSeq.current++}`;
        const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : null;
        const toolName = typeof payload.toolName === "string" ? payload.toolName : null;
        const path = typeof payload.path === "string" ? payload.path : null;
        const reason = typeof payload.reason === "string" ? payload.reason : null;
        const prompt = typeof payload.prompt === "string" ? payload.prompt : null;
        const summary = typeof payload.summary === "string" ? payload.summary : null;
        const errorMessage = typeof payload.error === "string" ? payload.error : null;
        const fileChanged = payload.fileChanged === true || kind === "file_changed";
        const argsPreview = payload.args == null ? null : JSON.stringify(payload.args).slice(0, 180);

        setSession((previous) => {
          const item: WarRoomSessionActivityItem = {
            id,
            kind,
            sessionId,
            at,
            label: kind.replace(/_/g, " "),
            detail: prompt ?? summary ?? errorMessage ?? reason ?? null,
            toolName,
            path,
            fileChanged,
          };
          const items = [...previous.items, item].slice(-40);
          let status = previous.status;
          if (["session_started", "turn_started", "tool_call", "tool_result", "file_changed"].includes(kind)) status = "running";
          if (kind === "need_input") status = "awaiting_input";
          if (kind === "tool_approval") status = "awaiting_approval";
          if (kind === "budget_exceeded") status = "budget_exceeded";
          if (kind === "session_completed") status = "completed";
          if (kind === "session_failed" || kind === "veto") status = "failed";
          return {
            ...previous,
            items,
            status,
            lastToolCall: kind === "tool_call" && toolName ? { toolName, argsPreview, at } : previous.lastToolCall,
            lastFileChanged: fileChanged ? { path, toolName, at } : previous.lastFileChanged,
            needInputPrompt: kind === "need_input" ? prompt : ["session_completed", "session_failed"].includes(kind) ? null : previous.needInputPrompt,
            pendingApproval: kind === "tool_approval" ? { toolName, reason: reason ?? "Approval required" } : ["session_completed", "session_failed"].includes(kind) ? null : previous.pendingApproval,
            budgetExceeded: kind === "budget_exceeded" ? {
              reason: reason ?? "Budget exceeded",
              spentTokens: typeof payload.spentTokens === "number" ? payload.spentTokens : undefined,
              spentCostUsd: typeof payload.spentCostUsd === "number" ? payload.spentCostUsd : undefined,
            } : previous.budgetExceeded,
            summary: summary ?? previous.summary,
            error: errorMessage ?? previous.error,
            lastEventAt: at,
          };
        });

        if (kind === "file_changed" || (kind === "tool_result" && fileChanged) || kind === "session_completed") {
          refreshScheduler.current.schedule(STEP_EVENT_REFRESH_MS);
        }
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
    session,
    refresh,
    scheduleRefresh,
    flushRefresh,
    retry,
  };
}
