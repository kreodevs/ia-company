import {
  formatHttpFetchError,
  httpFetch,
  opencodeInsecureTlsEnabled,
} from "./http-fetch.js";
import type { TenantOpencodeConfigResolved } from "./tenant-opencode.js";

export interface OpencodeSession {
  id: string;
  title?: string;
}

export interface OpencodeFileDiff {
  path?: string;
  file?: string;
  additions?: number;
  deletions?: number;
  [key: string]: unknown;
}

export class OpencodeClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(private readonly config: TenantOpencodeConfigResolved) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    const token = Buffer.from(`${config.username}:${config.password}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  private async request<T>(
    path: string,
    init?: { method?: string; body?: string; expectEmpty?: boolean },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await httpFetch(url, {
        method: init?.method,
        body: init?.body,
        headers: {
          Authorization: this.authHeader,
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
        timeoutMs: 15_000,
        insecureTls: opencodeInsecureTlsEnabled(),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `OpenCode ${init?.method ?? "GET"} ${path} failed (${res.status}): ${body.slice(0, 500)}`,
        );
      }

      if (init?.expectEmpty || res.status === 204) {
        return undefined as T;
      }

      return await res.json<T>();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("OpenCode ")) throw err;
      throw new Error(formatHttpFetchError(err, url));
    }
  }

  async health(): Promise<{ healthy: boolean; version?: string }> {
    return this.request("/global/health");
  }

  async createSession(title: string): Promise<OpencodeSession> {
    return this.request("/session", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async promptAsync(
    sessionId: string,
    text: string,
    options?: { agent?: string | null; model?: string | null; system?: string },
  ): Promise<void> {
    const parts = [{ type: "text", text }];
    await this.request(`/session/${encodeURIComponent(sessionId)}/prompt_async`, {
      method: "POST",
      expectEmpty: true,
      body: JSON.stringify({
        parts,
        agent: options?.agent ?? this.config.defaultAgent ?? undefined,
        model: options?.model ?? this.config.defaultModel ?? undefined,
        system: options?.system,
      }),
    });
  }

  async getSessionStatuses(): Promise<Record<string, string>> {
    return this.request("/session/status");
  }

  async getSession(sessionId: string): Promise<Record<string, unknown>> {
    return this.request(`/session/${encodeURIComponent(sessionId)}`);
  }

  async getSessionDiff(sessionId: string): Promise<OpencodeFileDiff[]> {
    return this.request(`/session/${encodeURIComponent(sessionId)}/diff`);
  }

  extractPendingPermissionIds(session: Record<string, unknown>, messages: unknown): string[] {
    const ids = new Set<string>();

    const pushId = (value: unknown) => {
      if (typeof value === "string" && value.trim()) ids.add(value.trim());
    };

    const scan = (node: unknown, depth = 0) => {
      if (!node || depth > 8) return;
      if (Array.isArray(node)) {
        for (const item of node) scan(item, depth + 1);
        return;
      }
      if (typeof node !== "object") return;
      const obj = node as Record<string, unknown>;

      pushId(obj.permissionID);
      pushId(obj.permissionId);
      pushId(obj.id);

      const status = typeof obj.status === "string" ? obj.status.toLowerCase() : "";
      const type = typeof obj.type === "string" ? obj.type.toLowerCase() : "";
      const pending =
        status.includes("pending") ||
        status === "ask" ||
        type.includes("permission") ||
        obj.pending === true;

      if (pending) {
        pushId(obj.permissionID);
        pushId(obj.permissionId);
        pushId(obj.id);
      }

      for (const value of Object.values(obj)) scan(value, depth + 1);
    };

    scan(session);
    scan(messages);
    return [...ids];
  }

  async autoApprovePendingPermissions(sessionId: string): Promise<number> {
    if (!this.config.autoApprovePermissions) return 0;

    let approved = 0;
    try {
      const [session, messages] = await Promise.all([
        this.getSession(sessionId).catch(() => ({})),
        this.getMessages(sessionId).catch(() => []),
      ]);
      const permissionIds = this.extractPendingPermissionIds(session, messages);
      for (const permissionId of permissionIds) {
        try {
          await this.respondPermission(sessionId, permissionId, "accept");
          approved += 1;
        } catch {
          try {
            await this.respondPermission(sessionId, permissionId, "once");
            approved += 1;
          } catch {
            // ignore individual permission failures
          }
        }
      }
    } catch {
      // ignore scan failures
    }
    return approved;
  }

  async getMessages(sessionId: string): Promise<Array<{ info?: { role?: string }; parts?: Array<{ type?: string; text?: string }> }>> {
    return this.request(`/session/${encodeURIComponent(sessionId)}/message`);
  }

  async abortSession(sessionId: string): Promise<void> {
    await this.request(`/session/${encodeURIComponent(sessionId)}/abort`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async respondPermission(
    sessionId: string,
    permissionId: string,
    response: string,
  ): Promise<void> {
    await this.request(
      `/session/${encodeURIComponent(sessionId)}/permissions/${encodeURIComponent(permissionId)}`,
      {
        method: "POST",
        body: JSON.stringify({ response, remember: true }),
      },
    );
  }

  extractAssistantSummary(
    messages: Array<{ info?: { role?: string }; parts?: Array<{ type?: string; text?: string }> }>,
  ): string {
    const assistants = messages.filter((m) => m.info?.role === "assistant");
    const last = assistants[assistants.length - 1];
    if (!last?.parts?.length) return "";
    return last.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("\n")
      .slice(0, 20_000);
  }

  isSessionIdle(statuses: Record<string, string>, sessionId: string): boolean {
    const status = statuses[sessionId];
    if (!status) return false;
    const normalized = status.toLowerCase();
    return normalized === "idle" || normalized === "completed" || normalized === "done";
  }

  isSessionRunning(statuses: Record<string, string>, sessionId: string): boolean {
    const status = statuses[sessionId];
    if (!status) return true;
    const normalized = status.toLowerCase();
    return normalized === "running" || normalized === "busy" || normalized === "active";
  }
}
