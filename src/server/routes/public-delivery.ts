import type { FastifyInstance } from "fastify";
import { getPublicDeliveryByToken } from "../../lib/encargo-delivery.js";

export async function publicDeliveryRoutes(app: FastifyInstance) {
  app.get<{ Params: { token: string } }>("/public/delivery/:token", async (request, reply) => {
    const payload = await getPublicDeliveryByToken(request.params.token);
    if (!payload) return reply.status(404).send({ error: "Delivery link not found" });
    return payload;
  });
}
