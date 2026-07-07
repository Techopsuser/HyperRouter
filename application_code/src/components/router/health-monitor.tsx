"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeartPulse, Activity, Clock, Zap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { providerColor, statusColor } from "./shared";

type Health = {
  modelId: string; provider: string; displayName: string; isReal: boolean;
  status: string; latencyMs: number; successRate: number; uptime: number;
  tokensPerSec: number; queueSize: number; requestsLastMin: number; errorRate: number;
};

export default function HealthMonitor() {
  const [health, setHealth] = useState<Health[]>([]);
  const [summary, setSummary] = useState({ healthy: 0, degraded: 0, down: 0 });

  useEffect(() => {
    const load = () => {
      fetch("/api/health").then((r) => r.json()).then((d) => {
        setHealth(d.health ?? []);
        setSummary(d.summary ?? { healthy: 0, degraded: 0, down: 0 });
      });
    };
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const sorted = [...health].sort((a, b) => {
    const order = { down: 0, degraded: 1, healthy: 2 } as Record<string, number>;
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-3">
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-semibold">Health Summary</span>
          </div>
          <div className="space-y-2.5">
            <HealthStat label="Healthy" count={summary.healthy} total={health.length} color="emerald" icon={CheckCircle2} />
            <HealthStat label="Degraded" count={summary.degraded} total={health.length} color="yellow" icon={AlertTriangle} />
            <HealthStat label="Down" count={summary.down} total={health.length} color="red" icon={XCircle} />
          </div>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Live Metrics</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Metric label="Avg latency" value={avg(health.map((h) => h.latencyMs)).toFixed(0) + "ms"} icon={Clock} />
            <Metric label="Avg throughput" value={avg(health.map((h) => h.tokensPerSec)).toFixed(0) + " t/s"} icon={Zap} />
            <Metric label="Req/min" value={sum(health.map((h) => h.requestsLastMin)).toString()} icon={Activity} />
            <Metric label="Avg uptime" value={(avg(health.map((h) => h.uptime)) * 100).toFixed(2) + "%"} icon={CheckCircle2} />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/60">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between">
          <span className="text-sm font-medium">Per-Model Health (updates every 4s)</span>
          <Badge variant="outline" className="text-[10px]">{health.length} models</Badge>
        </div>
        <ScrollArea className="h-[480px]">
          <div className="divide-y divide-border/40">
            {sorted.map((h, i) => (
              <motion.div
                key={h.modelId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.01, 0.3) }}
                className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="h-8 w-8 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: providerColor(h.provider) }}>
                  {h.modelId.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{h.displayName}</span>
                    {h.isReal && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{h.modelId} · {h.provider}</div>
                </div>
                <div className="hidden md:flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{h.latencyMs}ms</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{h.tokensPerSec} t/s</span>
                  <span>↑{h.requestsLastMin}/min</span>
                  {h.queueSize > 0 && <span className="text-yellow-600">queue: {h.queueSize}</span>}
                </div>
                <Badge variant="outline" className={`text-[10px] capitalize ${statusColor(h.status)}`}>
                  {h.status}
                </Badge>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }

function HealthStat({ label, count, total, color, icon: Icon }: { label: string; count: number; total: number; color: string; icon: any }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500 text-emerald-600",
    yellow: "bg-yellow-500 text-yellow-600",
    red: "bg-red-500 text-red-600",
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className={`h-3 w-3 ${colorMap[color].split(" ")[1]}`} /> {label}
        </span>
        <span className="text-sm font-semibold">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full ${colorMap[color].split(" ")[0]}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
      <div className="text-sm font-semibold font-mono">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
