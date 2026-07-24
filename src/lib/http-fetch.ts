import http from "node:http";
import https from "node:https";

export interface HttpFetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface HttpFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  insecureTls?: boolean;
}

export function httpFetch(url: string, init?: HttpFetchInit): Promise<HttpFetchResponse> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const timeoutMs = init?.timeoutMs ?? 15_000;

    const req = lib.request(
      parsed,
      {
        method: init?.method ?? "GET",
        headers: init?.headers,
        ...(isHttps && init?.insecureTls ? { rejectUnauthorized: false } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: async () => body,
            json: async <T = unknown>() => JSON.parse(body) as T,
          });
        });
      },
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(Object.assign(new Error(`Timed out after ${timeoutMs}ms`), { code: "ETIMEDOUT" }));
    });

    if (init?.body) req.write(init.body);
    req.end();
  });
}

function errorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const direct = (err as NodeJS.ErrnoException).code;
  if (typeof direct === "string") return direct;
  const cause = (err as { cause?: NodeJS.ErrnoException }).cause;
  if (cause && typeof cause.code === "string") return cause.code;
  return undefined;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function formatHttpFetchError(err: unknown, targetUrl: string): string {
  const code = errorCode(err);
  let host = targetUrl;
  try {
    host = new URL(targetUrl).host;
  } catch {
    // keep raw url
  }

  if (code === "ECONNREFUSED") {
    return `Cannot connect to ${host} (connection refused). The Auto-Company API must reach this URL — localhost/127.0.0.1 only works if OpenCode runs in the same container as the API.`;
  }
  if (code === "ENOTFOUND") {
    return `Host not found: ${host}. Check the OpenCode base URL.`;
  }
  if (code === "ECONNRESET") {
    return `Connection reset by ${host}.`;
  }
  if (code === "ETIMEDOUT") {
    return `Timed out connecting to ${host}.`;
  }
  if (
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "CERT_HAS_EXPIRED" ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN"
  ) {
    return `TLS certificate error for ${host}. Use a valid certificate or set OPENCODE_INSECURE_TLS=true on the API/worker for self-signed HTTPS.`;
  }

  const message = errorMessage(err);
  if (message === "fetch failed" || message === "Failed to fetch") {
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined;
    return cause
      ? `Network error reaching ${host}: ${cause}${code ? ` (${code})` : ""}`
      : `Network error reaching ${host}${code ? ` (${code})` : ""}. Ensure the URL is reachable from the API server, not only from your browser.`;
  }

  try {
    const hostname = new URL(targetUrl).hostname;
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)) {
      return `${message}. ${hostname} is only reachable from the same machine/container as the API — use a public or internal URL your deployment can access.`;
    }
  } catch {
    // ignore invalid url
  }

  return message;
}

export function opencodeInsecureTlsEnabled(): boolean {
  const value = process.env.OPENCODE_INSECURE_TLS;
  return value === "true" || value === "1";
}
