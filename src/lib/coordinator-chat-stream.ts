import {
  chat,
  chatParamsFromRequestBody,
  maxIterations,
  toServerSentEventsResponse,
} from "@tanstack/ai";
import { AGUIError } from "@ag-ui/core";
import { openaiCompatible } from "@tanstack/ai-openai/compatible";
import { prisma } from "./prisma.js";
import {
  providerConfigFromResolved,
  resolveOpenAiCompatibleCredentials,
} from "../core/providers.js";
import { resolveChatLlmConfig, tenantLlmFromRecord } from "./tenant-llm.js";
import {
  buildCoordinatorSystemPrompt,
  parseCoordinatorStreamScope,
  type CoordinatorChatScope,
} from "./coordinator-chat-context.js";
import { createCoordinatorChatTools, type CoordinatorToolContext } from "./coordinator-chat-tools.js";

export async function handleCoordinatorChatStream(
  tenantId: string,
  body: unknown,
): Promise<Response> {
  let params;
  try {
    params = await chatParamsFromRequestBody(body);
  } catch (err) {
    const message = err instanceof AGUIError ? err.message : "Invalid chat request body";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!params.messages.length) {
    return new Response(JSON.stringify({ error: "messages is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const scope = parseCoordinatorStreamScope(params.forwardedProps);
  const toolContext: CoordinatorToolContext = { tenantId, ...scope };

  const [systemPrompt, llmConfig] = await Promise.all([
    buildCoordinatorSystemPrompt(tenantId, scope),
    prisma.tenantLlmConfig.findUnique({ where: { tenantId } }),
  ]);

  const tenantLlm = tenantLlmFromRecord(llmConfig);
  const resolved = resolveChatLlmConfig(tenantLlm, { temperature: 0.65 });
  const providerConfig = providerConfigFromResolved(resolved);
  const { apiKey, baseURL, defaultHeaders } = resolveOpenAiCompatibleCredentials(providerConfig);

  const adapterFactory = openaiCompatible({
    name: resolved.provider,
    baseURL,
    apiKey,
    models: [resolved.model],
    ...(defaultHeaders ? { defaultHeaders } : {}),
  });

  const tools = createCoordinatorChatTools();

  const stream = chat({
    adapter: adapterFactory(resolved.model),
    messages: params.messages,
    tools,
    systemPrompts: [systemPrompt],
    agentLoopStrategy: maxIterations(8),
    modelOptions: {
      temperature: 0.65,
      max_tokens: 900,
    },
    context: toolContext,
    threadId: params.threadId,
    runId: params.runId,
    ...(params.parentRunId !== undefined ? { parentRunId: params.parentRunId } : {}),
  });

  return toServerSentEventsResponse(stream);
}

export type { CoordinatorChatScope };
