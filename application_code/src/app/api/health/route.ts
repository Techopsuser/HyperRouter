import { NextResponse } from "next/server";
import { getAllHealth, tickHealth } from "@/lib/health";
import { MODEL_REGISTRY } from "@/lib/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  tickHealth();
  const health = getAllHealth();
  const byStatus = {
    healthy: health.filter((h) => h.status === "healthy").length,
    degraded: health.filter((h) => h.status === "degraded").length,
    down: health.filter((h) => h.status === "down").length,
  };
  const enriched = health.map((h) => {
    const m = MODEL_REGISTRY.find((m) => m.id === h.modelId);
    return { ...h, provider: m?.provider, displayName: m?.displayName, isReal: m?.isReal };
  });
  return NextResponse.json({
    summary: byStatus,
    total: health.length,
    health: enriched,
  });
}
