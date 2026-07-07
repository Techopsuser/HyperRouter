"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, CheckCircle2, AlertTriangle, XCircle, Cpu } from "lucide-react";
import { providerColor } from "./shared";

type Provider = {
  id: string; name: string; color: string; description: string;
  modelCount: number; healthy: number; degraded: number; down: number;
  avgLatency: number; realModels: number;
};

export default function ProviderGrid() {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    const load = () => fetch("/api/providers").then((r) => r.json()).then((d) => setProviders(d.providers ?? []));
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map((p, i) => {
        const total = p.modelCount;
        const healthPct = total > 0 ? (p.healthy / total) * 100 : 0;
        const status = p.down > 0 ? "critical" : p.degraded > 0 ? "warning" : "ok";
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-4 border-border/60 hover:border-foreground/30 transition-colors h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                    style={{ background: p.color }}>
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.description}</div>
                  </div>
                </div>
                {status === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                 status === "warning" ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                 <XCircle className="h-4 w-4 text-red-500" />}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="rounded-lg bg-muted/40 py-1.5">
                  <div className="text-sm font-semibold">{p.modelCount}</div>
                  <div className="text-[9px] text-muted-foreground">Models</div>
                </div>
                <div className="rounded-lg bg-muted/40 py-1.5">
                  <div className="text-sm font-semibold font-mono">{p.avgLatency}ms</div>
                  <div className="text-[9px] text-muted-foreground">Avg Latency</div>
                </div>
                <div className="rounded-lg bg-muted/40 py-1.5">
                  <div className="text-sm font-semibold">{p.realModels}</div>
                  <div className="text-[9px] text-muted-foreground">Live</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Healthy</span>
                  <span className="font-mono">{p.healthy}/{total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                  <motion.div className="bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${(p.healthy / Math.max(total, 1)) * 100}%` }} transition={{ duration: 0.5 }} />
                  <motion.div className="bg-yellow-500" initial={{ width: 0 }} animate={{ width: `${(p.degraded / Math.max(total, 1)) * 100}%` }} transition={{ duration: 0.5 }} />
                  <motion.div className="bg-red-500" initial={{ width: 0 }} animate={{ width: `${(p.down / Math.max(total, 1)) * 100}%` }} transition={{ duration: 0.5 }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  {p.degraded > 0 && <span className="text-yellow-600">⚠ {p.degraded} degraded</span>}
                  {p.down > 0 && <span className="text-red-600">✕ {p.down} down</span>}
                  {!p.degraded && !p.down && <span className="text-emerald-600">All systems operational</span>}
                  {p.realModels > 0 && <Badge variant="outline" className="text-[9px] h-4 px-1 border-emerald-500/40 text-emerald-600"><Cpu className="h-2.5 w-2.5 mr-0.5" />live</Badge>}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
