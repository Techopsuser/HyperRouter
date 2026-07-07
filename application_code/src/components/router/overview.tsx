"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Boxes, HeartPulse, Trophy, Zap, Activity, ArrowRight, Brain,
  Cpu, ShieldCheck, Database, Sparkles, Server, GitBranch, Layers,
} from "lucide-react";
import { detectIntentLocal } from "./intent-client";

export default function Overview() {
  const [stats, setStats] = useState({
    models: 0, providers: 0, healthy: 0, total: 0, avgLatency: 0, cacheSize: 0,
  });
  const [intentInput, setIntentInput] = useState("Write a TypeScript hook that debounces a value with cleanup.");
  const [intent, setIntent] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/models").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()),
      fetch("/api/cache").then((r) => r.json()),
    ]).then(([m, h, c]) => {
      const health = h.health ?? [];
      setStats({
        models: m.total ?? 0,
        providers: m.providers?.length ?? 0,
        healthy: h.summary?.healthy ?? 0,
        total: health.length,
        avgLatency: Math.round(health.reduce((a: number, x: any) => a + x.latencyMs, 0) / Math.max(health.length, 1)),
        cacheSize: c.size ?? 0,
      });
    });
  }, []);

  useEffect(() => {
    setIntent(detectIntentLocal(intentInput));
  }, [intentInput]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 md:p-8"
      >
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" /> Production-grade
            </Badge>
            <Badge variant="outline" className="text-[10px]">OpenAI-compatible</Badge>
            <Badge variant="outline" className="text-[10px]">70+ free models</Badge>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight flex items-center gap-3 flex-wrap">
            <Image
              src="/hyperrouter-logo.png"
              alt="Hyperrouter"
              width={56}
              height={56}
              className="h-12 w-12 md:h-14 md:w-14 rounded-xl object-cover shadow-sm"
              priority
            />
            <span>Hyperrouter — Universal AI Routing Platform</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Intelligently routes every request to the best available free LLM. Automatic intent detection, capability scoring,
            health-aware load balancing, benchmarking, semantic caching, streaming, and graceful fallback — all behind one OpenAI-compatible API.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <HeroStat icon={Boxes} label="Registered models" value={stats.models} color="#10b981" />
            <HeroStat icon={Server} label="Providers" value={stats.providers} color="#6366f1" />
            <HeroStat icon={HeartPulse} label="Healthy now" value={`${stats.healthy}/${stats.total}`} color="#22c55e" />
            <HeroStat icon={Zap} label="Avg latency" value={`${stats.avgLatency}ms`} color="#f59e0b" />
            <HeroStat icon={Database} label="Cache entries" value={stats.cacheSize} color="#8b5cf6" />
          </div>
        </div>
      </motion.div>

      {/* Architecture flow */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">Routing Pipeline</span>
          <span className="text-[11px] text-muted-foreground ml-auto">Every request flows through these stages</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <PipelineStage icon={Brain} title="Intent Detection" desc="Classify 27 intent types" color="#10b981" />
          <PipelineStage icon={Layers} title="Capability Analysis" desc="Vision · tools · JSON · context" color="#14b8a6" />
          <PipelineStage icon={Cpu} title="Model Scoring" desc="Weighted multi-factor" color="#6366f1" />
          <PipelineStage icon={Trophy} title="Benchmark Lookup" desc="Per-category quality" color="#f59e0b" />
          <PipelineStage icon={HeartPulse} title="Health Filter" desc="Exclude degraded" color="#ef4444" />
          <PipelineStage icon={ShieldCheck} title="Fallback Chain" desc="Top-5 backups ready" color="#8b5cf6" />
          <PipelineStage icon={Sparkles} title="Stream Response" desc="SSE + cache write" color="#ec4899" />
        </div>
      </Card>

      {/* Live intent demo */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">Intent Detection — Live Demo</span>
          <span className="text-[11px] text-muted-foreground ml-auto">Type to classify in real time</span>
        </div>
        <Input
          value={intentInput}
          onChange={(e) => setIntentInput(e.target.value)}
          placeholder="Type a prompt…"
          className="mb-3"
        />
        {intent && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <IntentCard label="Detected Intent" value={intent.label} icon="Brain" color="#10b981" />
            <IntentCard label="Confidence" value={`${(intent.confidence * 100).toFixed(0)}%`} icon="Activity" color="#6366f1" />
            <IntentCard label="Complexity" value={intent.complexity} icon="Zap" color="#f59e0b" />
            <IntentCard label="Est. Tokens" value={intent.estimatedTokens.toLocaleString()} icon="Layers" color="#8b5cf6" />
            <div className="rounded-lg border border-border/60 p-3 col-span-full">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Detected Requirements</div>
              <div className="flex flex-wrap gap-2">
                <ReqChip label="Vision" active={intent.requiresVision} icon="Eye" />
                <ReqChip label="Tool Calling" active={intent.requiresTools} icon="Wrench" />
                <ReqChip label="JSON Mode" active={intent.requiresJson} icon="Braces" />
                <ReqChip label="Long Context" active={intent.contextSizeNeeded >= 128000} icon="ScrollText" />
                <ReqChip label={`Context ≥ ${(intent.contextSizeNeeded / 1000).toFixed(0)}K`} active icon="Database" />
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-background/60 backdrop-blur border border-border/40 px-3.5 py-2.5">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <div className="text-lg font-semibold font-mono leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

function PipelineStage({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="relative rounded-xl border border-border/60 p-3 bg-background/60 group"
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}20` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="text-xs font-semibold">{title}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</div>
      <ArrowRight className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
    </motion.div>
  );
}

function IntentCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}

function ReqChip({ label, active, icon }: { label: string; active: boolean; icon: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
      active ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground border-border/60"
    }`}>
      {active ? "✓" : "✕"} {label}
    </span>
  );
}
