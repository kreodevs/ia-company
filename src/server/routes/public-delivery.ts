import type { FastifyInstance } from "fastify";
import {
  getDeliveryExportHtml,
  getDeliveryMarkdownExport,
  getPublicDeliveryByToken,
} from "../../lib/encargo-delivery.js";

const PUBLIC_RATE_LIMIT = {
  rateLimit: {
    max: 40,
    timeWindow: "1 minute",
  },
};

function setPublicDeliveryHeaders(reply: { header: (k: string, v: string) => void }) {
  reply.header("X-Robots-Tag", "noindex, nofollow");
  reply.header("Cache-Control", "private, no-store");
}

export async function publicDeliveryRoutes(app: FastifyInstance) {
  app.get<{ Params: { token: string } }>(
    "/public/delivery/:token",
    { config: PUBLIC_RATE_LIMIT },
    async (request, reply) => {
      const payload = await getPublicDeliveryByToken(request.params.token);
      if (!payload) return reply.status(404).send({ error: "Delivery link not found" });
      setPublicDeliveryHeaders(reply);
      return payload;
    },
  );

  app.get<{ Params: { token: string }; Querystring: { print?: string } }>(
    "/public/delivery/:token/export.html",
    { config: PUBLIC_RATE_LIMIT },
    async (request, reply) => {
      const html = await getDeliveryExportHtml(request.params.token);
      if (!html) return reply.status(404).send({ error: "Delivery link not found or inactive" });
      setPublicDeliveryHeaders(reply);
      reply.header("Content-Type", "text/html; charset=utf-8");
      return html;
    },
  );

  app.get<{ Params: { token: string } }>(
    "/public/delivery/:token/export.md",
    { config: PUBLIC_RATE_LIMIT },
    async (request, reply) => {
      const markdown = await getDeliveryMarkdownExport(request.params.token);
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
