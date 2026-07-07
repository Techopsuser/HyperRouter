"use client";

import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function getIcon(name: string): LucideIcon {
  const ico = (Icons as unknown as Record<string, LucideIcon>)[name];
  return ico ?? Icons.Circle;
}

export const NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "playground", label: "Router Playground", icon: "Sparkles" },
  { id: "registry", label: "Model Registry", icon: "Boxes" },
  { id: "health", label: "Health Monitor", icon: "HeartPulse" },
  { id: "benchmarks", label: "Benchmarks", icon: "Trophy" },
  { id: "analytics", label: "Analytics", icon: "BarChart3" },
  { id: "providers", label: "Providers", icon: "Server" },
  { id: "docs", label: "API Docs", icon: "Code2" },
];

export function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-500";
  if (score >= 80) return "text-lime-500";
  if (score >= 70) return "text-yellow-500";
  if (score >= 60) return "text-orange-500";
  return "text-red-500";
}

export function scoreBg(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 80) return "bg-lime-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 60) return "bg-orange-500";
  return "bg-red-500";
}

export function statusColor(status: string): string {
  switch (status) {
    case "healthy": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    case "degraded": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
    case "down": return "text-red-500 bg-red-500/10 border-red-500/30";
    default: return "text-muted-foreground";
  }
}

export function providerColor(provider: string): string {
  const map: Record<string, string> = {
    zai: "#10b981",
    openrouter: "#6366f1",
    huggingface: "#f59e0b",
    cloudflare: "#ef4444",
    github: "#8b5cf6",
    ollama: "#14b8a6",
    lmstudio: "#ec4899",
    "local-gguf": "#a3a3a3",
    "openai-compatible": "#0ea5e9",
  };
  return map[provider] ?? "#64748b";
}

export function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}
