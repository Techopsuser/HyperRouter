"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { BarChart3, TrendingUp, Activity, Zap, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { providerColor, formatNum } from "./shared";

type Summary = {
  totalRequests: number;
  successRate: number;
  failureRate: number;
  cacheHitRate: number;
  avgLatencyMs: number;
  totalTokens: number;
  activeModels: number;
  fallbackRate: number;
  byIntent: Record<string, number>;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  latencyBuckets: { bucket: string; count: number }[];
  requestTimeline: { ts: number; count: number; success: number }[];
  successTrend: { ts: number; rate: number }[];
};

const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899", "#0ea5e9", "#a3a3a3"];

export default function AnalyticsPanel() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/analytics?window=120").then((r) => r.json()).then(setData);
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading analytics…</div>;

  const intentData = Object.entries(data.byIntent).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  const providerData = Object.entries(data.byProvider).map(([name, value]) => ({ name, value }));
  const modelData = Object.entries(data.byModel).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const timeline = data.requestTimeline.map((t) => ({
    time: new Date(t.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    requests: t.count,
    success: t.success,
  }));
  const successTrend = data.successTrend.map((t) => ({
    time: new Date(t.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    rate: +(t.rate * 100).toFixed(1),
  }));

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Kpi icon={Activity} label="Requests" value={formatNum(data.totalRequests)} color="#6366f1" />
        <Kpi icon={CheckCircle2} label="Success" value={(data.successRate * 100).toFixed(1) + "%"} color="#10b981" />
        <Kpi icon={AlertCircle} label="Failure" value={(data.failureRate * 100).toFixed(1) + "%"} color="#ef4444" />
        <Kpi icon={Database} label="Cache Hit" value={(data.cacheHitRate * 100).toFixed(1) + "%"} color="#8b5cf6" />
        <Kpi icon={Zap} label="Avg Latency" value={data.avgLatencyMs + "ms"} color="#f59e0b" />
        <Kpi icon={TrendingUp} label="Tokens" value={formatNum(data.totalTokens)} color="#14b8a6" />
        <Kpi icon={BarChart3} label="Fallback" value={(data.fallbackRate * 100).toFixed(1) + "%"} color="#ec4899" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Request timeline */}
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Request Volume (last 120 min)</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gReq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSucc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={2} fill="url(#gReq)" />
              <Area type="monotone" dataKey="success" stroke="#6366f1" strokeWidth={2} fill="url(#gSucc)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Success rate trend */}
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Success Rate Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={successTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Latency distribution */}
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Latency Distribution</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.latencyBuckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.latencyBuckets.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Intent distribution */}
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold">Requests by Intent</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={intentData} layout="vertical" margin={{ top: 4, right: 8, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={90} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Provider pie */}
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Traffic by Provider</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={providerData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={2}
              >
                {providerData.map((entry, i) => (
                  <Cell key={i} fill={providerColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top models */}
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-semibold">Top Models by Usage</span>
          </div>
          <div className="space-y-2">
            {modelData.map((m, i) => {
              const max = modelData[0]?.value || 1;
              return (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                  <span className="text-xs font-mono w-28 truncate">{m.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${(m.value / max) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{m.value}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card className="p-3 border-border/60 relative overflow-hidden">
      <div className="absolute top-0 right-0 h-16 w-16 rounded-full opacity-10 blur-xl" style={{ background: color }} />
      <Icon className="h-4 w-4 mb-1.5" style={{ color }} />
      <div className="text-lg font-semibold font-mono leading-tight">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </Card>
  );
}
