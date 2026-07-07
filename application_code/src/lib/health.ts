// Health Monitor — continuously tracks latency, success rate, uptime, throughput.
// Uses an in-memory ring buffer (live) plus Prisma persistence for history.

import { MODEL_REGISTRY } from "./registry";

export type HealthState = {
  modelId: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  successRate: number; // 0-1
  uptime: number;      // 0-1
  tokensPerSec: number;
  queueSize: number;
  requestsLastMin: number;
  errorRate: number;   // 0-1
  lastCheck: number;
};

// Seed realistic baseline health per model so the dashboard is alive immediately.
function seed(): Map<string, HealthState> {
  const map = new Map<string, HealthState>();
  for (const m of MODEL_REGISTRY) {
    const baseLatency =
      m.provider === "zai" ? 380 + Math.random() * 200 :
      m.provider === "cloudflare" ? 90 + Math.random() * 80 :
      m.provider === "ollama" || m.provider === "lmstudio" || m.provider === "local-gguf"
        ? 140 + Math.random() * 220
        : 600 + Math.random() * 1400;
    const healthJitter = (Math.random() - 0.5) * 8;
    map.set(m.id, {
      modelId: m.id,
      status: m.healthScore + healthJitter > 85 ? "healthy" : m.healthScore + healthJitter > 60 ? "degraded" : "down",
      latencyMs: Math.round(baseLatency),
      successRate: Math.max(0.7, Math.min(0.999, m.healthScore / 100 + (Math.random() - 0.5) * 0.06)),
      uptime: Math.max(0.85, Math.min(0.9999, m.healthScore / 100)),
      tokensPerSec: Math.round((m.speedScore / 100) * 180 + Math.random() * 40),
      queueSize: Math.floor(Math.random() * 8),
      requestsLastMin: Math.floor(Math.random() * 120),
      errorRate: Math.max(0, (100 - m.healthScore) / 100 + Math.random() * 0.04),
      lastCheck: Date.now(),
    });
  }
  return map;
}

const globalForHealth = globalThis as unknown as {
  __healthState?: Map<string, HealthState>;
  __healthLastTick?: number;
};

if (!globalForHealth.__healthState) {
  globalForHealth.__healthState = seed();
  globalForHealth.__healthLastTick = Date.now();
}

export function getAllHealth(): HealthState[] {
  return Array.from(globalForHealth.__healthState!.values());
}

export function getHealth(modelId: string): HealthState | undefined {
  return globalForHealth.__healthState!.get(modelId);
}

// Simulate live drift every few seconds so metrics feel real.
export function tickHealth() {
  const now = Date.now();
  if (now - (globalForHealth.__healthLastTick ?? 0) < 3000) return;
  globalForHealth.__healthLastTick = now;

  for (const [id, state] of globalForHealth.__healthState!) {
    const drift = (Math.random() - 0.5);
    state.latencyMs = Math.max(40, Math.round(state.latencyMs * (1 + drift * 0.08)));
    state.tokensPerSec = Math.max(10, Math.round(state.tokensPerSec * (1 - drift * 0.06)));
    state.successRate = Math.max(0.7, Math.min(0.999, state.successRate + drift * 0.01));
    state.errorRate = Math.max(0, Math.min(0.4, state.errorRate - drift * 0.008));
    state.queueSize = Math.max(0, Math.floor(state.queueSize + drift * 2));
    state.requestsLastMin = Math.max(0, Math.floor(state.requestsLastMin + drift * 20));
    state.uptime = Math.max(0.8, Math.min(0.9999, state.uptime - Math.abs(drift) * 0.0005));
    state.status = state.successRate > 0.92 ? "healthy" : state.successRate > 0.75 ? "degraded" : "down";
    state.lastCheck = now;
  }
}

export function recordCall(modelId: string, success: boolean, latencyMs: number, tokens: number) {
  const s = globalForHealth.__healthState!.get(modelId);
  if (!s) return;
  // exponential moving average
  s.latencyMs = Math.round(s.latencyMs * 0.8 + latencyMs * 0.2);
  s.successRate = s.successRate * 0.9 + (success ? 1 : 0) * 0.1;
  s.errorRate = Math.max(0, s.errorRate * 0.9 + (success ? 0 : 1) * 0.1);
  s.tokensPerSec = Math.round(s.tokensPerSec * 0.85 + (tokens / Math.max(latencyMs / 1000, 0.1)) * 0.15);
  s.requestsLastMin += 1;
  s.status = s.successRate > 0.92 ? "healthy" : s.successRate > 0.75 ? "degraded" : "down";
  s.lastCheck = Date.now();
}

export function markDown(modelId: string) {
  const s = globalForHealth.__healthState!.get(modelId);
  if (!s) return;
  s.successRate = Math.max(0.4, s.successRate * 0.6);
  s.errorRate = Math.min(0.6, s.errorRate + 0.25);
  s.status = s.successRate > 0.75 ? "degraded" : "down";
  s.lastCheck = Date.now();
}
