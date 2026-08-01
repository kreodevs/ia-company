import type { FastifyInstance } from "fastify";
import {
  DeliveryPinError,
  getDeliveryExportHtml,
  getDeliveryMarkdownExport,
  getPublicDeliveryByToken,
  unlockPublicDelivery,
} from "../../lib/encargo-delivery.js";

const PUBLIC_RATE_LIMIT = {
  rateLimit: {
    max: 40,
    timeWindow: "1 minute",
  },
};

const UNLOCK_RATE_LIMIT = {
  rateLimit: {
    max: 10,
    timeWindow: "1 minute",
  },
};

function readDeliveryPin(request: {
  headers: Record<string, unknown>;
  query?: { pin?: string };
}): string | undefined {
  const header = request.headers["x-delivery-pin"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const queryPin = request.query?.pin;
  if (typeof queryPin === "string" && queryPin.trim()) return queryPin.trim();
  return undefined;
}

function setPublicDeliveryHeaders(reply: { header: (k: string, v: string) => void }) {
  reply.header("X-Robots-Tag", "noindex, nofollow");
  reply.header("Cache-Control", "private, no-store");
}

export async function publicDeliveryRoutes(app: FastifyInstance) {
  app.get<{ Params: { token: string } }>(
    "/public/delivery/:token",
    { config: PUBLIC_RATE_LIMIT },
    async (request, reply) => {
      const payload = await getPublicDeliveryByToken(
        request.params.token,
        readDeliveryPin({
          headers: request.headers as Record<string, unknown>,
        }),
      );
      if (!payload) return reply.status(404).send({ error: "Delivery link not found" });
      setPublicDeliveryHeaders(reply);
      return payload;
    },
  );

  app.post<{ Params: { token: string }; Body: { pin?: string } }>(
    "/public/delivery/:token/unlock",
    { config: UNLOCK_RATE_LIMIT },
    async (request, reply) => {
      try {
        const pin = request.body?.pin?.trim();
        if (!pin) return reply.status(400).send({ error: "pin is required" });
        const payload = await unlockPublicDelivery(request.params.token, pin);
        setPublicDeliveryHeaders(reply);
        return payload;
      } catch (err) {
        if (err instanceof DeliveryPinError) {
          return reply.status(401).send({ error: err.message });
        }
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode: number }).statusCode)
            : 500;
        const message = err instanceof Error ? err.message : "Unlock failed";
        return reply.status(statusCode).send({ error: message });
      }
    },
  );

  app.get<{ Params: { token: string }; Querystring: { print?: string; pin?: string } }>(
    "/public/delivery/:token/export.html",
    { config: PUBLIC_RATE_LIMIT },
    async (request, reply) => {
      const html = await getDeliveryExportHtml(
        request.params.token,
        readDeliveryPin({
          headers: request.headers as Record<string, unknown>,
          query: request.query,
        }),
      );
      if (!html) return reply.status(404).send({ error: "Delivery link not found or inactive" });
      setPublicDeliveryHeaders(reply);
      reply.header("Content-Type", "text/html; charset=utf-8");
      return html;
    },
  );

  app.get<{ Params: { token: string }; Querystring: { pin?: string } }>(
    "/public/delivery/:token/export.md",
    { config: PUBLIC_RATE_LIMIT },
    async (request, reply) => {
      const markdown = await getDeliveryMarkdownExport(
        request.params.token,
        readDeliveryPin({
          headers: request.headers as Record<string, unknown>,
          query: request.query,
        }),
      );
      if (!markdown) return reply.status(404).send({ error: "Delivery link not found or inactive" });
      setPublicDeliveryHeaders(reply);
      reply.header("Content-Type", "text/markdown; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename="delivery-${request.params.token.slice(0, 8)}.md"`,
      );
      return markdown;
    },
  );
}
