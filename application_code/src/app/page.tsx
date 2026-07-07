"use client";

import { createElement, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Github, Heart, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_SECTIONS, getIcon } from "@/components/router/shared";
import Overview from "@/components/router/overview";
import RouterPlayground from "@/components/router/playground";
import ModelRegistry from "@/components/router/model-registry";
import HealthMonitor from "@/components/router/health-monitor";
import BenchmarkBoard from "@/components/router/benchmark-board";
import AnalyticsPanel from "@/components/router/analytics-panel";
import ProviderGrid from "@/components/router/provider-grid";
import ApiDocs from "@/components/router/api-docs";

export default function Home() {
  const [active, setActive] = useState("overview");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] px-4 h-14 flex items-center gap-4">
          <button onClick={() => scrollTo("overview")} className="flex items-center gap-2 shrink-0">
            <Image
              src="/hyperrouter-logo.png"
              alt="Hyperrouter logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
              priority
            />
            <span className="font-bold text-sm tracking-tight hidden sm:inline">Hyperrouter</span>
          </button>
          <nav className="flex-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-0.5 min-w-max">
              {NAV_SECTIONS.map((s) => {
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      active === s.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {createElement(getIcon(s.icon), { className: "h-3.5 w-3.5" })} <span className="hidden md:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <Button variant="outline" size="sm" className="h-8 shrink-0" asChild>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <Github className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Docs</span>
            </a>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto max-w-[1400px] w-full px-4 py-6 space-y-12">
        <section id="overview" className="scroll-mt-20">
          <Overview />
        </section>

        <section id="playground" className="scroll-mt-20">
          <SectionHeader
            kicker="Live demo"
            title="Router Playground"
            desc="Send a prompt and watch the router detect intent, score candidates, select the best healthy model, stream a response, and fall back automatically if a provider fails."
          />
          <RouterPlayground />
        </section>

        <section id="registry" className="scroll-mt-20">
          <SectionHeader
            kicker="70+ models"
            title="Universal Model Registry"
            desc="Every model ships with structured metadata — capability scores, context length, vision/tools/JSON flags, health, and benchmarks. The router reads from this metadata, never hardcodes decisions."
          />
          <ModelRegistry />
        </section>

        <section id="health" className="scroll-mt-20">
          <SectionHeader
            kicker="Real-time"
            title="Health Monitor"
            desc="Continuously tracks latency, success rate, uptime, throughput, queue size, and error rate for every model. Degraded models are automatically excluded from routing."
          />
          <HealthMonitor />
        </section>

        <section id="benchmarks" className="scroll-mt-20">
          <SectionHeader
            kicker="Quality signals"
            title="Benchmark Leaderboard"
            desc="Per-category benchmark scores (coding, reasoning, math, writing, accuracy, hallucination, throughput, reliability, user ratings) feed the scoring engine so routing improves over time."
          />
          <BenchmarkBoard />
        </section>

        <section id="analytics" className="scroll-mt-20">
          <SectionHeader
            kicker="Observability"
            title="Analytics Dashboard"
            desc="Request volume, success rate, cache hits, latency distribution, intent mix, provider traffic, and top models — all updating live."
          />
          <AnalyticsPanel />
        </section>

        <section id="providers" className="scroll-mt-20">
          <SectionHeader
            kicker="Abstraction layer"
            title="Provider Status"
            desc="Nine providers abstracted behind one interface — Z.AI (live), OpenRouter, HuggingFace, Cloudflare AI, GitHub Models, Ollama, LM Studio, local GGUF, and OpenAI-compatible gateways. Add new providers by configuration only."
          />
          <ProviderGrid />
        </section>

        <section id="docs" className="scroll-mt-20">
          <SectionHeader
            kicker="OpenAI-compatible"
            title="API Documentation"
            desc="Point any OpenAI client at Hyperrouter. Set model='auto' and let the router decide, or pin a specific model for manual mode."
          />
          <ApiDocs />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-[1400px] px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/hyperrouter-logo.png"
                alt="Hyperrouter logo"
                width={24}
                height={24}
                className="h-6 w-6 rounded-md object-cover"
              />
              <div>
                <div className="text-xs font-semibold">Hyperrouter</div>
                <div className="text-[10px] text-muted-foreground">Universal AI Routing Platform · v1.0</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> All systems operational</span>
              <span>OpenAI-compatible</span>
              <span>70+ free models</span>
              <span className="flex items-center gap-1">Built with <Heart className="h-3 w-3 text-rose-500" /></span>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 h-10 w-10 rounded-full bg-foreground text-background shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </div>
  );
}

function SectionHeader({ kicker, title, desc }: { kicker: string; title: string; desc: string }) {
  return (
    <div className="mb-5 max-w-3xl">
      <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-1.5">{kicker}</div>
      <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
    </div>
  );
}
