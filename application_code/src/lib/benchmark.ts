// Benchmark Engine — maintains benchmark scores per model per category.
// Seeded deterministically from model metadata so leaderboards are stable & realistic.

import { MODEL_REGISTRY, ModelCapability } from "./registry";

export type BenchmarkCategory =
  | "coding" | "reasoning" | "math" | "writing" | "accuracy"
  | "hallucination" | "speed" | "reliability" | "user_rating";

export type BenchmarkScore = {
  modelId: string;
  category: BenchmarkCategory;
  score: number;     // 0-100
  samples: number;
  rank: number;
};

const CATEGORY_LABELS: Record<BenchmarkCategory, string> = {
  coding: "Coding (HumanEval+)",
  reasoning: "Reasoning (MMLU-Pro)",
  math: "Math (GSM8K / MATH)",
  writing: "Writing (AlpacaEval)",
  accuracy: "Factual Accuracy",
  hallucination: "Low Hallucination",
  speed: "Throughput (tok/s)",
  reliability: "Reliability (uptime)",
  user_rating: "User Rating",
};

export function categoryLabel(c: BenchmarkCategory) {
  return CATEGORY_LABELS[c];
}

function computeScore(m: ModelCapability, c: BenchmarkCategory): { score: number; samples: number } {
  const samples = 200 + Math.floor((m.benchmarkScore % 7) * 130);
  switch (c) {
    case "coding": return { score: m.codingScore, samples };
    case "reasoning": return { score: m.reasoningScore, samples };
    case "math": return { score: m.mathScore, samples };
    case "writing": return { score: m.writingScore, samples };
    case "accuracy": return { score: Math.min(99, m.qualityScore + 3), samples };
    case "hallucination": return { score: Math.max(40, 100 - (100 - m.qualityScore) * 1.4), samples };
    case "speed": return { score: m.speedScore, samples };
    case "reliability": return { score: m.healthScore, samples };
    case "user_rating": return { score: Math.min(99, m.qualityScore * 0.5 + m.benchmarkScore * 0.5), samples };
  }
}

const globalForBench = globalThis as unknown as { __bench?: BenchmarkScore[] };
if (!globalForBench.__bench) {
  const all: BenchmarkScore[] = [];
  for (const m of MODEL_REGISTRY) {
    (Object.keys(CATEGORY_LABELS) as BenchmarkCategory[]).forEach((c) => {
      const { score, samples } = computeScore(m, c);
      all.push({ modelId: m.id, category: c, score: Math.round(score * 10) / 10, samples, rank: 0 });
    });
  }
  // assign ranks per category
  for (const c of Object.keys(CATEGORY_LABELS) as BenchmarkCategory[]) {
    const catScores = all.filter((s) => s.category === c).sort((a, b) => b.score - a.score);
    catScores.forEach((s, i) => { s.rank = i + 1; });
  }
  globalForBench.__bench = all;
}

export function getAllBenchmarks(): BenchmarkScore[] {
  return globalForBench.__bench!;
}

export function getLeaderboard(category?: BenchmarkCategory, limit = 10) {
  const all = globalForBench.__bench!;
  const filtered = category ? all.filter((s) => s.category === category) : all;
  const byModel = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const s of filtered) {
    byModel.set(s.modelId, (byModel.get(s.modelId) ?? 0) + s.score);
    counts.set(s.modelId, (counts.get(s.modelId) ?? 0) + 1);
  }
  const avg = Array.from(byModel.entries()).map(([modelId, total]) => ({
    modelId,
    avg: total / (counts.get(modelId) ?? 1),
  }));
  return avg.sort((a, b) => b.avg - a.avg).slice(0, limit);
}

export function getCategoryLeaderboard(category: BenchmarkCategory, limit = 12) {
  return getAllBenchmarks()
    .filter((s) => s.category === category)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
