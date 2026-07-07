// LLM Provider — wraps z-ai-web-dev-sdk for actual live inference.
// Real models: glm-4.7 and glm-4.7-flash. All other registry models are
// simulated via the same SDK with provider/model metadata overlay, but only
// the GLM family is invoked against the live backend.

import ZAI from "z-ai-web-dev-sdk";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StreamCallbacks = {
  onToken?: (token: string) => void;
  onDone?: (full: string, meta: { tokens: number; latencyMs: number; model: string }) => void;
  onError?: (err: unknown) => void;
};

let _client: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getClient() {
  if (_client) return _client;
  _client = await ZAI.create();
  return _client;
}

// Map our router's selected model to the SDK call. Only GLM models are "real".
export function resolveRealModelId(modelId: string): "glm-4.7" | "glm-4.7-flash" | null {
  if (modelId === "glm-4.7") return "glm-4.7";
  if (modelId === "glm-4.7-flash") return "glm-4.7-flash";
  return null;
}

// Non-streaming completion (used for fallback / cache warm).
export async function complete(
  messages: ChatMessage[],
  modelId: string,
  opts?: { temperature?: number; maxTokens?: number }
): Promise<{ text: string; latencyMs: number; tokens: number }> {
  const start = Date.now();
  const realId = resolveRealModelId(modelId) ?? "glm-4.7-flash";
  const client = await getClient();
  const res = await client.chat.completions.create({
    messages,
    model: realId,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.maxTokens ?? 1024,
    stream: false,
  });
  const text = (res as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? "";
  const tokens = Math.ceil(text.length / 4);
  return { text, latencyMs: Date.now() - start, tokens };
}

// Streaming completion via SSE-style token callback.
// Returns true if real tokens were produced, false if the stream was empty
// (e.g. rate-limited without throwing) so the router can trigger fallback.
export async function streamComplete(
  messages: ChatMessage[],
  modelId: string,
  cb: StreamCallbacks,
  opts?: { temperature?: number; maxTokens?: number; signal?: AbortSignal }
): Promise<boolean> {
  const start = Date.now();
  const realId = resolveRealModelId(modelId) ?? "glm-4.7-flash";
  let full = "";
  let tokens = 0;
  try {
    const client = await getClient();
    const stream = await client.chat.completions.create({
      messages,
      model: realId,
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.maxTokens ?? 1024,
      stream: true,
    });

    for await (const chunk of stream as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>) {
      if (opts?.signal?.aborted) break;
      const token = chunk.choices?.[0]?.delta?.content ?? "";
      if (token) {
        full += token;
        tokens += 1;
        cb.onToken?.(token);
      }
    }

    if (full.length === 0) {
      // Stream completed but produced no content (likely rate-limited).
      cb.onError?.(new Error("empty_stream: provider returned no content (rate limit)"));
      return false;
    }
    cb.onDone?.(full, { tokens, latencyMs: Date.now() - start, model: realId });
    return true;
  } catch (err) {
    cb.onError?.(err);
    return false;
  }
}

// Simulated streaming for non-real (registered but not SDK-backed) models.
// Produces a contextual, clearly-labeled response demonstrating the provider
// abstraction & fallback layer working end-to-end.
export async function simulateStream(
  messages: ChatMessage[],
  model: { id: string; displayName: string; provider: string; contextLength: number; benchmarkScore: number },
  intent: { label: string; confidence: number },
  cb: StreamCallbacks,
  opts?: { signal?: AbortSignal }
): Promise<void> {
  const start = Date.now();
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const prompt = lastUser?.content ?? "";
  const promptPreview = prompt.length > 160 ? prompt.slice(0, 160) + "…" : prompt;

  const response =
    `📡 **Routed via ${model.provider} → ${model.displayName}**\n\n` +
    `The Hyperrouter analyzed your prompt and detected **${intent.label}** ` +
    `(${(intent.confidence * 100).toFixed(0)}% confidence). Based on multi-factor ` +
    `capability scoring (benchmark ${model.benchmarkScore.toFixed(1)}, health, speed, ` +
    `context fit), **${model.displayName}** was selected as the optimal healthy model ` +
    `from the ${model.provider} provider.\n\n` +
    `**Routing decision:**\n` +
    `- Intent: ${intent.label}\n` +
    `- Selected model: ${model.displayName} (${model.provider})\n` +
    `- Context window: ${(model.contextLength / 1000).toFixed(0)}K tokens\n` +
    `- Benchmark score: ${model.benchmarkScore.toFixed(1)}/100\n\n` +
    `In a production deployment with all providers connected, this response would be ` +
    `generated natively by ${model.displayName} via the ${model.provider} gateway. ` +
    `This simulated stream demonstrates the provider abstraction and automatic ` +
    `fallback layer working end-to-end after the primary GLM model was unavailable.\n\n` +
    `**Your prompt:** ${promptPreview}\n\n` +
    `— Hyperrouter provider abstraction layer`;

  // Stream word-by-word with realistic pacing.
  const words = response.split(/(\s+)/);
  let full = "";
  for (const w of words) {
    if (opts?.signal?.aborted) break;
    full += w;
    cb.onToken?.(w);
    await new Promise((r) => setTimeout(r, 12 + Math.random() * 28));
  }
  cb.onDone?.(full, { tokens: words.length, latencyMs: Date.now() - start, model: model.id });
}
