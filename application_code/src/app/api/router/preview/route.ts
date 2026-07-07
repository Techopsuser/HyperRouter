import { NextResponse } from "next/server";
import { routeRequest } from "@/lib/router";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { prompt, preferReal, requireStreaming } = (await req.json()) as {
    prompt?: string; preferReal?: boolean; requireStreaming?: boolean;
  };
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
  const decision = routeRequest(prompt, { preferReal, requireStreaming });
  return NextResponse.json({
    intent: decision.intent,
    selected: decision.selected ? {
      modelId: decision.selected.model.id,
      displayName: decision.selected.model.displayName,
      provider: decision.selected.model.provider,
      score: decision.selected.score,
      breakdown: decision.selected.breakdown,
      reasons: decision.selected.reasons,
      isReal: decision.selected.model.isReal,
    } : null,
    fallbackChain: decision.fallbackChain.map((c) => ({
      modelId: c.model.id, displayName: c.model.displayName, provider: c.model.provider,
      score: c.score, isReal: c.model.isReal,
    })),
    topCandidates: decision.candidates.slice(0, 10).map((c) => ({
      modelId: c.model.id, displayName: c.model.displayName, provider: c.model.provider,
      score: c.score, eligible: c.eligible, isReal: c.model.isReal,
    })),
    timestamp: decision.timestamp,
  });
}
