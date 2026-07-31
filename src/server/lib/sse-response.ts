import { Readable } from "node:stream";
import type { FastifyReply } from "fastify";

export async function pipeWebResponseToFastify(
  reply: FastifyReply,
  webResponse: Response,
): Promise<void> {
  reply.hijack();
  reply.raw.writeHead(
    webResponse.status,
    Object.fromEntries(webResponse.headers.entries()),
  );

  if (!webResponse.body) {
    reply.raw.end();
    return;
  }

  const nodeStream = Readable.fromWeb(webResponse.body as ReadableStream<Uint8Array>);
  await new Promise<void>((resolve, reject) => {
    nodeStream.on("error", reject);
    reply.raw.on("error", reject);
    nodeStream.pipe(reply.raw);
    nodeStream.on("end", resolve);
  });
}
