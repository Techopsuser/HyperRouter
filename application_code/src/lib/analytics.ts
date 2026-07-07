// Analytics — in-memory request log feeding the dashboard charts.

export type AnalyticsEvent = {
  id: string;
  modelId: string;
  provider: string;
  intent: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  success: boolean;
  cached: boolean;
  fallbackUsed: boolean;
  ts: number;
};

const globalForAnalytics = globalThis as unknown as { __analytics?: AnalyticsEvent[]; __seq?: number };
if (!globalForAnalytics.__analytics) {
  globalForAnalytics.__analytics = [];
  globalForAnalytics.__seq = 0;
  // seed some history so charts aren't empty
  const now = Date.now();
  const intents = ["coding", "reasoning", "creative_writing", "mathematics", "summarization", "translation", "tool_calling", "general_chat"];
  const models = ["glm-4.7", "glm-4.7-flash", "deepseek-v3.1", "qwen2.5-coder", "llama-3.1", "gemma-3", "mistral-7b", "phi-4"];
  const providers = ["zai", "openrouter", "cloudflare"];
  for (let i = 0; i < 220; i++) {
    const modelId = models[Math.floor(Math.random() * models.length)];
    const intent = intents[Math.floor(Math.random() * intents.length)];
    globalForAnalytics.__analytics.push({
      id: `seed-${i}`,
      modelId,
      provider: modelId.startsWith("glm") ? "zai" : providers[Math.floor(Math.random() * providers.length)],
      intent,
      promptTokens: 50 + Math.floor(Math.random() * 1800),
      completionTokens: 40 + Math.floor(Math.random() * 600),
      latencyMs: 200 + Math.floor(Math.random() * 2600),
      success: Math.random() > 0.08,
      cached: Math.random() > 0.78,
      fallbackUsed: Math.random() > 0.88,
      ts: now - (220 - i) * 1000 * 60 * 3 - Math.floor(Math.random() * 60000),
    });
  }
}

export function logEvent(e: Omit<AnalyticsEvent, "id" | "ts"> & { ts?: number }) {
  const seq = (globalForAnalytics.__seq ?? 0) + 1;
  globalForAnalytics.__seq = seq;
  const id = `e-${seq}`;
  globalForAnalytics.__analytics!.push({ id, ts: e.ts ?? Date.now(), ...e });
  // cap memory
  if (globalForAnalytics.__analytics!.length > 5000) {
    globalForAnalytics.__analytics!.splice(0, 1000);
  }
}

export function getAllEvents(): AnalyticsEvent[] {
  return globalForAnalytics.__analytics!;
}

export type AnalyticsSummary = {
  totalRequests: number;
  successRate: number;
  failureRate: number;
  cacheHitRate: number;
  avgLatencyMs: number;
  totalTokens: number;
  activeModels: number;
  fallbackRate: number;
  byIntent: Record<string, number>;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  latencyBuckets: { bucket: string; count: number }[];
  requestTimeline: { ts: number; count: number; success: number }[];
  successTrend: { ts: number; rate: number }[];
};

export function summarizeAnalytics(windowMinutes = 60): AnalyticsSummary {
  const all = getAllEvents();
  const cutoff = Date.now() - windowMinutes * 60 * 1000;
  const recent = all.filter((e) => e.ts >= cutoff);

  const totalRequests = recent.length;
  const success = recent.filter((e) => e.success).length;
  const cached = recent.filter((e) => e.cached).length;
  const fallback = recent.filter((e) => e.fallbackUsed).length;

  const byIntent: Record<string, number> = {};
  const byProvider: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  let totalTokens = 0;
  let totalLatency = 0;

  for (const e of recent) {
    byIntent[e.intent] = (byIntent[e.intent] ?? 0) + 1;
    byProvider[e.provider] = (byProvider[e.provider] ?? 0) + 1;
    byModel[e.modelId] = (byModel[e.modelId] ?? 0) + 1;
    totalTokens += e.promptTokens + e.completionTokens;
    totalLatency += e.latencyMs;
  }

  // latency buckets
  const bucketDefs = [
    { label: "<500ms", min: 0, max: 500 },
    { label: "0.5-1s", min: 500, max: 1000 },
    { label: "1-2s", min: 1000, max: 2000 },
    { label: "2-4s", min: 2000, max: 4000 },
    { label: "4s+", min: 4000, max: Infinity },
  ];
  const latencyBuckets = bucketDefs.map((b) => ({
    bucket: b.label,
    count: recent.filter((e) => e.latencyMs >= b.min && e.latencyMs < b.max).length,
  }));

  // timeline (binned per minute)
  const bins = new Map<number, { count: number; success: number }>();
  for (const e of recent) {
    const bucket = Math.floor(e.ts / 60000) * 60000;
    const cur = bins.get(bucket) ?? { count: 0, success: 0 };
    cur.count += 1;
    if (e.success) cur.success += 1;
    bins.set(bucket, cur);
  }
  const requestTimeline = Array.from(bins.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, v]) => ({ ts, count: v.count, success: v.success }));
  const successTrend = requestTimeline.map((t) => ({
    ts: t.ts,
    rate: t.count > 0 ? t.success / t.count : 1,
  }));

  return {
    totalRequests,
    successRate: totalRequests > 0 ? success / totalRequests : 1,
    failureRate: totalRequests > 0 ? (totalRequests - success) / totalRequests : 0,
    cacheHitRate: totalRequests > 0 ? cached / totalRequests : 0,
    avgLatencyMs: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
    totalTokens,
    activeModels: Object.keys(byModel).length,
    fallbackRate: totalRequests > 0 ? fallback / totalRequests : 0,
    byIntent, byProvider, byModel,
    latencyBuckets, requestTimeline, successTrend,
  };
}
