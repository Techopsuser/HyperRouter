"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Crown, Award } from "lucide-react";
import { providerColor, scoreColor, scoreBg } from "./shared";

type Cat = { id: string; label: string; leaderboard: { modelId: string; avg: number }[] };
type Overall = { modelId: string; avg: number };

const CATS = [
  { id: "coding", label: "Coding", color: "#6366f1" },
  { id: "reasoning", label: "Reasoning", color: "#f59e0b" },
  { id: "math", label: "Math", color: "#14b8a6" },
  { id: "writing", label: "Writing", color: "#ec4899" },
  { id: "accuracy", label: "Accuracy", color: "#10b981" },
  { id: "hallucination", label: "Low Hallucination", color: "#8b5cf6" },
  { id: "speed", label: "Throughput", color: "#0ea5e9" },
  { id: "reliability", label: "Reliability", color: "#22c55e" },
  { id: "user_rating", label: "User Rating", color: "#eab308" },
];

const MODEL_META: Record<string, { provider: string; display: string }> = {
  "glm-4.7": { provider: "zai", display: "GLM-4.7" },
  "glm-4.7-flash": { provider: "zai", display: "GLM-4.7 Flash" },
};

export default function BenchmarkBoard() {
  const [data, setData] = useState<{ categories: Cat[]; overall: Overall[] } | null>(null);
  const [activeCat, setActiveCat] = useState<string>("overall");

  useEffect(() => {
    fetch("/api/benchmarks").then((r) => r.json()).then((d) => setData(d));
  }, []);

  if (!data) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading benchmarks…</div>;

  const list = activeCat === "overall"
    ? data.overall.map((o) => ({ modelId: o.modelId, avg: o.avg }))
    : (data.categories.find((c) => c.id === activeCat)?.leaderboard ?? []);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <Card className="overflow-hidden border-border/60">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">Benchmark Leaderboard</span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {activeCat === "overall" ? "Overall (weighted)" : CATS.find((c) => c.id === activeCat)?.label}
          </Badge>
        </div>
        <div className="p-4 space-y-1.5 max-h-[520px] overflow-y-auto">
          {list.map((entry, i) => {
            const meta = MODEL_META[entry.modelId];
            const provider = meta?.provider ?? guessProvider(entry.modelId);
            const display = meta?.display ?? entry.modelId;
            return (
              <motion.div
                key={entry.modelId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="w-7 flex justify-center">
                  {i === 0 ? <Crown className="h-4 w-4 text-amber-500" /> :
                   i === 1 ? <Medal className="h-4 w-4 text-slate-400" /> :
                   i === 2 ? <Award className="h-4 w-4 text-amber-700" /> :
                   <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>}
                </div>
                <div className="h-8 w-8 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: providerColor(provider) }}>
                  {entry.modelId.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{display}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{entry.modelId}</div>
                </div>
                <div className="w-32 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full ${scoreBg(entry.avg)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${entry.avg}%` }}
                      transition={{ duration: 0.5, delay: i * 0.03 }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-mono font-semibold w-12 text-right ${scoreColor(entry.avg)}`}>
                  {entry.avg.toFixed(1)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 border-border/60">
        <div className="text-sm font-semibold mb-3">Categories</div>
        <div className="space-y-1.5">
          <Button
            variant={activeCat === "overall" ? "default" : "outline"}
            onClick={() => setActiveCat("overall")}
            className="w-full justify-start h-8 text-xs"
          >
            <Trophy className="h-3.5 w-3.5 mr-2" /> Overall Ranking
          </Button>
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`w-full flex items-center gap-2 px-3 h-8 rounded-md text-xs transition-colors ${
                activeCat === c.id ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
              <span className="flex-1 text-left">{c.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function guessProvider(id: string): string {
  if (id.startsWith("glm")) return "zai";
  if (id.startsWith("cf-")) return "cloudflare";
  if (id.startsWith("hf-")) return "huggingface";
  if (id.startsWith("gh-")) return "github";
  if (id.startsWith("ollama")) return "ollama";
  if (id.startsWith("lms-")) return "lmstudio";
  if (id.startsWith("gguf")) return "local-gguf";
  if (id.startsWith("oai-")) return "openai-compatible";
  return "openrouter";
}
