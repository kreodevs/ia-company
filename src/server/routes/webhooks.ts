import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { ingestStripeWebhook } from "../../lib/product-revenue.js";
import { handleRouteError } from "../lib/request-context.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.post<{ Params: { productId: string } }>(
    "/webhooks/stripe/:productId",
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      try {
        const product = await prisma.tenantProduct.findUnique({
          where: { id: request.params.productId },
          select: { id: true, tenantId: true, slug: true },
        });
        if (!product) {
          return reply.status(404).send({ error: "Product not found" });
        }

        const rawBody = (request as { rawBody?: Buffer }).rawBody;
        const payload =
          rawBody ??
          Buffer.from(
            typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {}),
            "utf8",
          );
        const signature = request.headers["stripe-signature"] as string | undefined;

        const result = await ingestStripeWebhook({
          productId: product.id,
          tenantId: product.tenantId,
          payload,
          signature,
        });

        return reply.send({ received: true, ...result });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
