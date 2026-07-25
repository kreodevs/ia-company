import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { ingestStripeWebhook } from "../../lib/product-revenue.js";
import { HttpError, handleRouteError } from "../lib/request-context.js";

type RequestWithRawBody = FastifyRequest & { rawBody?: Buffer };

export async function webhookRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request, body, done) => {
      (request as RequestWithRawBody).rawBody = body as Buffer;
      try {
        const json = JSON.parse((body as Buffer).toString("utf8"));
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post<{ Params: { productId: string } }>(
    "/webhooks/stripe/:productId",
    async (request, reply) => {
      try {
        const product = await prisma.tenantProduct.findUnique({
          where: { id: request.params.productId },
          select: { id: true, tenantId: true, slug: true },
        });
        if (!product) {
          return reply.status(404).send({ error: "Product not found" });
        }

        const rawBody = (request as RequestWithRawBody).rawBody;
        if (!rawBody?.length) {
          throw new HttpError(400, "Webhook body is required");
        }

        const signature = request.headers["stripe-signature"] as string | undefined;

        const result = await ingestStripeWebhook({
          productId: product.id,
          tenantId: product.tenantId,
          payload: rawBody,
          signature,
        });

        return reply.send({ received: true, ...result });
      } catch (err) {
        if (err instanceof Error && err.message.includes("Stripe")) {
          return reply.status(400).send({ error: err.message });
        }
        return handleRouteError(reply, err);
      }
    },
  );
}
