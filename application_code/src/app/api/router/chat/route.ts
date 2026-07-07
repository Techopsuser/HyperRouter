import { routeRequest } from "@/lib/router";
import { streamComplete, simulateStream, resolveRealModelId, ChatMessage } from "@/lib/llm";
import { cacheGet, cacheSet } from "@/lib/cache";
import { recordCall, markDown } from "@/lib/health";
import { logEvent } from "@/lib/analytics";
import { getModel } from "@/lib/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/router/chat — OpenAI-compatible streaming endpoint.
// Body: { messages: ChatMessage[], stream?: boolean, manualModelId?: string, temperature?, maxTokens? }
// Returns SSE stream when stream=true, else JSON.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages?: ChatMessage[];
    stream?: boolean;
    manualModelId?: string;
    temperature?: number;
    maxTokens?: number;
    preferReal?: boolean;
  };

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const prompt = lastUser?.content ?? "";

  // Manual mode: bypass router.
  let chosenModelId = body.manualModelId;
  let decision = routeRequest(prompt, { preferReal: body.preferReal });
  let fallbackChain = decision.fallbackChain.map((c) => ({
    modelId: c.model.id, displayName: c.model.displayName, provider: c.model.provider, isReal: c.model.isReal,
  }));
  let fallbackUsed = false;
  let routingReasons: string[] = [];

  if (!chosenModelId) {
    chosenModelId = decision.selected?.model.id ?? "glm-4.7-flash";
    routingReasons = decision.selected?.reasons ?? [];
  } else {
    fallbackChain = decision.candidates
      .filter((c) => c.model.id !== chosenModelId && c.eligible)
      .slice(0, 5)
      .map((c) => ({
        modelId: c.model.id, displayName: c.model.displayName, provider: c.model.provider, isReal: c.model.isReal,
      }));
  }

  // Cache check (only when not manual and prompt is non-trivial)
  const cached = cacheGet(prompt, chosenModelId);
  if (cached && !body.manualModelId) {
    logEvent({
      modelId: chosenModelId,
      provider: getModel(chosenModelId)?.provider ?? "unknown",
      intent: decision.intent.intent,
      promptTokens: decision.intent.estimatedTokens,
      completionTokens: Math.ceil(cached.response.length / 4),
      latencyMs: 2,
      success: true,
      cached: true,
      fallbackUsed: false,
    });
    if (body.stream === false) {
      return Response.json({
        id: `chatcmpl-cache-${Date.now()}`,
        object: "chat.completion",
        model: chosenModelId,
        choices: [{ index: 0, message: { role: "assistant", content: cached.response }, finish_reason: "stop" }],
        cached: true,
        routing: {
          intent: decision.intent,
          selectedModel: chosenModelId,
          reasons: routingReasons,
          fallbackChain,
          fallbackUsed: false,
        },
      });
    }
    // stream cached
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const meta = `data: ${JSON.stringify({ type: "meta", routing: { intent: decision.intent, selectedModel: chosenModelId, reasons: routingReasons, fallbackChain, fallbackUsed: false, cached: true } })}\n\n`;
        controller.enqueue(encoder.encode(meta));
        const chunk = `data: ${JSON.stringify({ type: "token", content: cached.response })}\n\n`;
        controller.enqueue(encoder.encode(chunk));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", cached: true, model: chosenModelId })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming path
  if (body.stream === false) {
    const tried: string[] = [];
    let attemptId = chosenModelId;
    while (attemptId) {
      tried.push(attemptId);
      const realId = resolveRealModelId(attemptId);
      const start = Date.now();
      try {
        if (!realId) throw new Error("simulated_unavailable");
        // Only real models can actually call the SDK.
        const { complete } = await import("@/lib/llm");
        const { text, latencyMs, tokens } = await complete(messages, attemptId, {
          temperature: body.temperature, maxTokens: body.maxTokens,
        });
        cacheSet(prompt, attemptId, text, decision.intent.intent);
        recordCall(attemptId, true, latencyMs, tokens);
        logEvent({
          modelId: attemptId, provider: getModel(attemptId)?.provider ?? "unknown",
          intent: decision.intent.intent, promptTokens: decision.intent.estimatedTokens,
          completionTokens: tokens, latencyMs, success: true, cached: false, fallbackUsed: fallbackUsed,
        });
        return Response.json({
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          model: attemptId,
          choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
          routing: {
            intent: decision.intent, selectedModel: attemptId, reasons: routingReasons,
            fallbackChain, fallbackUsed, tried,
          },
        });
      } catch {
        markDown(attemptId);
        const next = fallbackChain.shift();
        if (!next) {
          logEvent({
            modelId: attemptId, provider: getModel(attemptId)?.provider ?? "unknown",
            intent: decision.intent.intent, promptTokens: decision.intent.estimatedTokens,
            completionTokens: 0, latencyMs: Date.now() - start, success: false, cached: false, fallbackUsed: true,
          });
          return Response.json({ error: "All models failed", tried }, { status: 503 });
        }
        attemptId = next.modelId;
        fallbackUsed = true;
      }
    }
    return Response.json({ error: "no model" }, { status: 503 });
  }

  // Streaming path with automatic fallback
  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal?.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({
        type: "meta",
        routing: {
          intent: decision.intent,
          selectedModel: chosenModelId,
          reasons: routingReasons,
          fallbackChain,
          fallbackUsed: false,
          cached: false,
        },
      });

      let attemptId = chosenModelId;
      let fullText = "";
      let totalTokens = 0;
      let startLatency = Date.now();
      const tried: string[] = [];

      while (attemptId) {
        tried.push(attemptId);
        const realId = resolveRealModelId(attemptId);
        const modelMeta = getModel(attemptId);
        startLatency = Date.now();

        let success = false;

        if (realId) {
          // Real GLM model — call the live SDK.
          let errored = false;
          const ok = await streamComplete(
            messages,
            attemptId,
            {
              onToken: (t) => {
                fullText += t;
                totalTokens += 1;
                send({ type: "token", content: t, model: attemptId });
              },
              onDone: (_full, meta) => {
                cacheSet(prompt, attemptId, _full, decision.intent.intent);
                recordCall(attemptId, true, meta.latencyMs, meta.tokens);
                logEvent({
                  modelId: attemptId, provider: modelMeta?.provider ?? "zai",
                  intent: decision.intent.intent, promptTokens: decision.intent.estimatedTokens,
                  completionTokens: meta.tokens, latencyMs: meta.latencyMs, success: true,
                  cached: false, fallbackUsed,
                });
              },
              onError: (err) => {
                errored = true;
                markDown(attemptId);
                send({ type: "fallback", from: attemptId, reason: String(err).slice(0, 120) });
              },
            },
            { temperature: body.temperature, maxTokens: body.maxTokens, signal: abort.signal }
          );
          success = ok && !errored && fullText.length > 0;
        } else if (modelMeta) {
          // Simulated provider — generate a contextual response locally.
          send({ type: "status", model: attemptId, message: `Routing through ${modelMeta.provider} gateway…` });
          await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
          await simulateStream(
            messages,
            {
              id: modelMeta.id, displayName: modelMeta.displayName, provider: modelMeta.provider,
              contextLength: modelMeta.contextLength, benchmarkScore: modelMeta.benchmarkScore,
            },
            decision.intent,
            {
              onToken: (t) => {
                fullText += t;
                totalTokens += 1;
                send({ type: "token", content: t, model: attemptId });
              },
              onDone: (_full, meta) => {
                cacheSet(prompt, attemptId, _full, decision.intent.intent);
                recordCall(attemptId, true, meta.latencyMs, meta.tokens);
                logEvent({
                  modelId: attemptId, provider: modelMeta.provider,
                  intent: decision.intent.intent, promptTokens: decision.intent.estimatedTokens,
                  completionTokens: meta.tokens, latencyMs: meta.latencyMs, success: true,
                  cached: false, fallbackUsed,
                });
              },
              onError: () => {
                markDown(attemptId);
                send({ type: "fallback", from: attemptId, reason: "simulated provider unavailable" });
              },
            },
            { signal: abort.signal }
          );
          success = fullText.length > 0;
        }

        if (success) {
          send({ type: "done", model: attemptId, fallbackUsed, tried, latencyMs: Date.now() - startLatency });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // Fallback
        const next = fallbackChain.shift();
        if (!next) {
          send({ type: "error", message: "All models in fallback chain failed", tried });
          logEvent({
            modelId: attemptId, provider: getModel(attemptId)?.provider ?? "unknown",
            intent: decision.intent.intent, promptTokens: decision.intent.estimatedTokens,
            completionTokens: totalTokens, latencyMs: Date.now() - startLatency,
            success: false, cached: false, fallbackUsed: true,
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        send({ type: "fallback", from: attemptId, to: next.modelId, reason: "provider failure — retrying next best model" });
        attemptId = next.modelId;
        fallbackUsed = true;
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
