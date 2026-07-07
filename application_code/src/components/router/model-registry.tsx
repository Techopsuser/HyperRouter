"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, Boxes, Eye, Wrench, Braces, Zap, Cpu, Filter, Star } from "lucide-react";
import { providerColor, scoreColor, scoreBg, formatNum } from "./shared";

type Model = {
  id: string; provider: string; family: string; displayName: string;
  contextLength: number; maxOutputTokens: number;
  speedScore: number; qualityScore: number; reasoningScore: number; codingScore: number;
  mathScore: number; writingScore: number; multilingualScore: number;
  visionSupport: boolean; toolCalling: boolean; functionCalling: boolean; jsonMode: boolean;
  structuredOutput: boolean; embeddingSupport: boolean; streaming: boolean;
  freeOrPaid: string; benchmarkScore: number; healthScore: number; isReal: boolean;
  description: string;
};

const PROVIDER_FILTERS = ["all", "zai", "openrouter", "huggingface", "cloudflare", "github", "ollama", "lmstudio", "local-gguf", "openai-compatible"];
const CAP_FILTERS = [
  { id: "vision", label: "Vision", icon: Eye, key: "visionSupport" as const },
  { id: "tools", label: "Tools", icon: Wrench, key: "toolCalling" as const },
  { id: "json", label: "JSON", icon: Braces, key: "jsonMode" as const },
  { id: "stream", label: "Stream", icon: Zap, key: "streaming" as const },
  { id: "embed", label: "Embed", icon: Cpu, key: "embeddingSupport" as const },
];

export default function ModelRegistry() {
  const [models, setModels] = useState<Model[]>([]);
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("all");
  const [caps, setCaps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"benchmark" | "speed" | "coding" | "reasoning" | "context">("benchmark");

  useEffect(() => {
    fetch("/api/models").then((r) => r.json()).then((d) => {
      setModels(d.models ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let r = models.filter((m) => {
      if (provider !== "all" && m.provider !== provider) return false;
      if (q && !`${m.id} ${m.displayName} ${m.family} ${m.provider}`.toLowerCase().includes(q.toLowerCase())) return false;
      for (const c of caps) {
        const f = CAP_FILTERS.find((cf) => cf.id === c);
        if (f && !m[f.key]) return false;
      }
      return true;
    });
    r = [...r].sort((a, b) => {
      switch (sort) {
        case "speed": return b.speedScore - a.speedScore;
        case "coding": return b.codingScore - a.codingScore;
        case "reasoning": return b.reasoningScore - a.reasoningScore;
        case "context": return b.contextLength - a.contextLength;
        default: return b.benchmarkScore - a.benchmarkScore;
      }
    });
    return r;
  }, [models, q, provider, caps, sort]);

  const toggleCap = (id: string) => {
    setCaps((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  return (
    <Card className="overflow-hidden border-border/60">
      <div className="p-4 border-b border-border/60 bg-muted/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Boxes className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">Universal Model Registry</div>
              <div className="text-[11px] text-muted-foreground">{filtered.length} of {models.length} models · structured metadata-driven routing</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(["benchmark", "speed", "coding", "reasoning", "context"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={sort === s ? "default" : "outline"}
                onClick={() => setSort(s)}
                className="h-7 text-[11px] capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search models, families, providers…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="h-3 w-3 text-muted-foreground mr-0.5" />
            {PROVIDER_FILTERS.map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  provider === p ? "bg-foreground text-background border-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {CAP_FILTERS.map((c) => {
              const I = c.icon;
              const active = caps.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCap(c.id)}
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    active ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/40" : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <I className="h-2.5 w-2.5" /> {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <ScrollArea className="h-[560px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium py-2 px-3">Model</th>
                <th className="text-left font-medium py-2 px-2">Provider</th>
                <th className="text-right font-medium py-2 px-2">Context</th>
                <th className="text-center font-medium py-2 px-2">Caps</th>
                <th className="text-right font-medium py-2 px-2">Bench</th>
                <th className="text-right font-medium py-2 px-2">Coding</th>
                <th className="text-right font-medium py-2 px-2">Reason</th>
                <th className="text-right font-medium py-2 px-2">Math</th>
                <th className="text-right font-medium py-2 px-2">Speed</th>
                <th className="text-right font-medium py-2 px-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <ModelRow key={m.id} m={m} index={i} />
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                    No models match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </Card>
  );
}

function ModelRow({ m, index }: { m: Model; index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.01, 0.3) }}
      className="border-b border-border/40 hover:bg-muted/30 transition-colors group"
    >
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0"
            style={{ background: providerColor(m.provider) }}>
            {m.id.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">{m.displayName}</span>
              {m.isReal && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 border-emerald-500/40 text-emerald-600 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />LIVE
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono truncate">{m.id}</div>
          </div>
        </div>
      </td>
      <td className="py-2.5 px-2">
        <span className="text-[11px] text-muted-foreground">{m.provider}</span>
      </td>
      <td className="py-2.5 px-2 text-right text-[11px] font-mono text-muted-foreground">
        {formatNum(m.contextLength)}
      </td>
      <td className="py-2.5 px-2">
        <div className="flex items-center justify-center gap-0.5">
          {m.visionSupport && <Eye className="h-3 w-3 text-muted-foreground" />}
          {m.toolCalling && <Wrench className="h-3 w-3 text-muted-foreground" />}
          {m.jsonMode && <Braces className="h-3 w-3 text-muted-foreground" />}
          {m.streaming && <Zap className="h-3 w-3 text-muted-foreground" />}
        </div>
      </td>
      <td className="py-2.5 px-2 text-right">
        <ScorePill v={m.benchmarkScore} />
      </td>
      <td className="py-2.5 px-2 text-right"><ScorePill v={m.codingScore} /></td>
      <td className="py-2.5 px-2 text-right"><ScorePill v={m.reasoningScore} /></td>
      <td className="py-2.5 px-2 text-right"><ScorePill v={m.mathScore} /></td>
      <td className="py-2.5 px-2 text-right"><ScorePill v={m.speedScore} /></td>
      <td className="py-2.5 px-2 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${scoreBg(m.healthScore)}`} style={{ width: `${m.healthScore}%` }} />
          </div>
          <span className={`text-[11px] font-mono w-6 ${scoreColor(m.healthScore)}`}>{m.healthScore.toFixed(0)}</span>
        </div>
      </td>
    </motion.tr>
  );
}

function ScorePill({ v }: { v: number }) {
  return (
    <span className={`text-[11px] font-mono ${scoreColor(v)}`}>{v.toFixed(1)}</span>
  );
}
