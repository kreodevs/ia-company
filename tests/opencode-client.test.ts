import assert from "node:assert/strict";
import http from "node:http";
import { describe, it } from "node:test";
import { OpencodeClient } from "../src/lib/opencode-client.js";

function startMockOpencodeServer() {
  const sessions = new Map<string, { status: string }>();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    res.setHeader("Content-Type", "application/json");

    if (url.pathname === "/global/health") {
      res.end(JSON.stringify({ healthy: true, version: "mock-1" }));
      return;
    }

    if (url.pathname === "/session" && req.method === "POST") {
      const id = `sess_${sessions.size + 1}`;
      sessions.set(id, { status: "running" });
      res.end(JSON.stringify({ id, title: "mock" }));
      return;
    }

    if (url.pathname === "/session/status") {
      const status: Record<string, string> = {};
      for (const [id, row] of sessions) status[id] = row.status;
      res.end(JSON.stringify(status));
      return;
    }

    const promptMatch = url.pathname.match(/^\/session\/([^/]+)\/prompt_async$/);
    if (promptMatch && req.method === "POST") {
      res.writeHead(204);
      res.end();
      return;
    }

    const diffMatch = url.pathname.match(/^\/session\/([^/]+)\/diff$/);
    if (diffMatch) {
      res.end(JSON.stringify([{ path: "src/mock.ts", additions: 2, deletions: 0 }]));
      return;
    }

    const messagesMatch = url.pathname.match(/^\/session\/([^/]+)\/message$/);
    if (messagesMatch) {
      const id = messagesMatch[1]!;
      sessions.set(id, { status: "idle" });
      res.end(JSON.stringify([{ info: { role: "assistant" }, parts: [{ type: "text", text: "Done" }] }]));
      return;
    }

    const sessionMatch = url.pathname.match(/^\/session\/([^/]+)$/);
    if (sessionMatch) {
      res.end(JSON.stringify({ id: sessionMatch[1], status: "running" }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "not found" }));
  });

  return new Promise<{ server: http.Server; baseUrl: string }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe("OpencodeClient mock server", () => {
  it("creates session, prompts async, reads diff", async () => {
    const { server, baseUrl } = await startMockOpencodeServer();
    try {
      const client = new OpencodeClient({
        tenantId: "t1",
        enabled: true,
        baseUrl,
        username: "opencode",
        password: "secret",
        defaultAgent: null,
        defaultModel: null,
        projectPath: null,
        pollIntervalMs: 100,
        maxWaitMs: 5000,
        autoApprovePermissions: false,
      });

      const health = await client.health();
      assert.equal(health.healthy, true);

      const session = await client.createSession("test");
      await client.promptAsync(session.id, "implement feature");

      const statuses = await client.getSessionStatuses();
      assert.equal(statuses[session.id], "running");

      const diff = await client.getSessionDiff(session.id);
      assert.equal(diff[0]?.path, "src/mock.ts");

      const messages = await client.getMessages(session.id);
      assert.match(client.extractAssistantSummary(messages), /Done/);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});
