import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { ingestStripeWebhook } from "../../lib/product-revenue.js";
import { recordWaitlistSignup } from "../../lib/product-waitlist.js";
import { ingestCampaignMetricSignal } from "../../lib/product-signals.js";
import { syncRecommendationsToDesk } from "../../lib/product-desk-recommender.js";
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

  app.post<{
    Params: { productId: string };
    Body: { email?: string; apiKey?: string; source?: string };
  }>("/webhooks/waitlist/:productId", async (request, reply) => {
    try {
      const product = await prisma.tenantProduct.findUnique({
        where: { id: request.params.productId },
        select: { id: true, tenantId: true },
      });
      if (!product) {
        return reply.status(404).send({ error: "Product not found" });
      }

      const email = request.body?.email?.trim();
      if (!email) {
        throw new HttpError(400, "Email is required");
      }

      const apiKey =
        (request.headers["x-waitlist-key"] as string | undefined)?.trim() ||
        request.body?.apiKey?.trim();
      if (!apiKey) {
        throw new HttpError(401, "Waitlist API key is required");
      }

      const result = await recordWaitlistSignup({
        productId: product.id,
        tenantId: product.tenantId,
        email,
        apiKey,
        source: request.body?.source,
      });

      return reply.status(result.created ? 201 : 200).send({
        ok: true,
        created: result.created,
        waitlistCount: result.waitlistCount,
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Invalid email address") {
          return reply.status(400).send({ error: err.message });
        }
        if (err.message === "Invalid waitlist API key") {
          return reply.status(401).send({ error: err.message });
        }
      }
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Params: { productId: string };
    Body: { metric?: string; value?: number; source?: string; apiKey?: string };
  }>("/webhooks/campaign/:productId", async (request, reply) => {
    try {
      const product = await prisma.tenantProduct.findUnique({
        where: { id: request.params.productId },
        select: { id: true, tenantId: true },
      });
      if (!product) {
        return reply.status(404).send({ error: "Product not found" });
      }

      const metric = request.body?.metric?.trim();
      const value = request.body?.value;
      if (!metric || typeof value !== "number" || Number.isNaN(value)) {
        throw new HttpError(400, "metric (string) and value (number) are required");
      }

      const apiKey =
        (request.headers["x-campaign-key"] as string | undefined)?.trim() ||
        request.body?.apiKey?.trim();
      if (!apiKey) {
        throw new HttpError(401, "Campaign API key is required");
      }

      const signal = await ingestCampaignMetricSignal({
        tenantId: product.tenantId,
        productId: product.id,
        metric,
        value,
        source: request.body?.source,
      });

      await syncRecommendationsToDesk({
        tenantId: product.tenantId,
        productId: product.id,
      });

      return reply.status(201).send({ ok: true, signal });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
