import { NextResponse } from "next/server";
import { PROVIDERS, MODEL_REGISTRY } from "@/lib/registry";
import { getAllHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = getAllHealth();
  const byProvider = PROVIDERS.map((p) => {
    const models = MODEL_REGISTRY.filter((m) => m.provider === p.id);
    const states = health.filter((h) => models.some((m) => m.id === h.modelId));
    const healthy = states.filter((s) => s.status === "healthy").length;
    const avgLatency = states.length > 0 ? Math.round(states.reduce((a, s) => a + s.latencyMs, 0) / states.length) : 0;
    return {
      ...p,
      modelCount: models.length,
      healthy,
      degraded: states.filter((s) => s.status === "degraded").length,
      down: states.filter((s) => s.status === "down").length,
      avgLatency,
      realModels: models.filter((m) => m.isReal).length,
    };
  });
  return NextResponse.json({ providers: byProvider });
}
