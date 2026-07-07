import { NextResponse } from "next/server";
import { getAllBenchmarks, getLeaderboard, categoryLabel, BenchmarkCategory } from "@/lib/benchmark";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") as BenchmarkCategory | null;
  if (category) {
    const all = getAllBenchmarks().filter((s) => s.category === category).sort((a, b) => b.score - a.score);
    return NextResponse.json({ category, label: categoryLabel(category), scores: all });
  }
  return NextResponse.json({
    categories: (["coding", "reasoning", "math", "writing", "accuracy", "hallucination", "speed", "reliability", "user_rating"] as BenchmarkCategory[]).map((c) => ({
      id: c, label: categoryLabel(c), leaderboard: getLeaderboard(c, 8),
    })),
    overall: getLeaderboard(undefined, 15),
    all: getAllBenchmarks(),
  });
}
