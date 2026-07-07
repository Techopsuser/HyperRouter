"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Send, Zap, ShieldCheck, Activity, Cpu, ArrowRight,
  Layers, Gauge, Brain, Loader2, Square, RotateCcw, ChevronDown,
  CheckCircle2, AlertTriangle, Database, Webhook, Eye, ScrollText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getIcon, scoreColor, scoreBg, providerColor } from "./shared";

type ChatMsg = { role: "user" | "assistant" | "system"; content: string; routing?: any };

type RoutingMeta = {
  intent: any;
  selectedModel: string;
  reasons: string[];
  fallbackChain: { modelId: string; displayName: string; provider: string; isReal: boolean }[];
  fallbackUsed: boolean;
  cached: boolean;
};

type StreamEvent =
  | { type: "meta"; routing: RoutingMeta }
  | { type: "status"; model: string; message: string }
  | { type: "token"; content: string; model: string }
  | { type: "fallback"; from: string; to?: string; reason: string }
  | { type: "done"; model: string; fallbackUsed: boolean; tried: string[]; latencyMs: number }
  | { type: "error"; message: string };

const SAMPLE_PROMPTS = [
  { label: "Code a debounce hook", text: "Write a TypeScript React useDebounce hook with cleanup, generics, and tests explanation.", icon: "Code2" },
  { label: "Debug a crash", text: "My Next.js app throws hydration mismatch errors when rendering a date. Why and how do I fix it?", icon: "Bug" },
  { label: "Prove a theorem", text: "Prove that the sum of two odd integers is always even, step by step.", icon: "Sigma" },
  { label: "Summarize long doc", text: "Summarize the entire attached 50-page research paper on transformer attention into 5 key bullet points.", icon: "FileText" },
  { label: "JSON schema", text: "Generate a JSON schema for a paginated API response with user objects and metadata, in strict JSON mode.", icon: "Braces" },
  { label: "Vision / OCR", text: "Describe the architecture diagram image and extract the OCR text from the labels.", icon: "Eye" },
];

export default function RouterPlayground() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "system",
      content: "Welcome to the Hyperrouter Playground. Send a prompt and watch the router detect intent, score candidates, and stream a live response with automatic fallback.",
    },
  ]);
  const [streaming, setStreaming] = useState(false);
  const [liveRouting, setLiveRouting] = useState<RoutingMeta | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("");
  const [liveFallback, setLiveFallback] = useState<{ from: string; to?: string; reason: string } | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [autoFallback, setAutoFallback] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: ChatMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    const promptText = input;
    setInput("");
    setStreaming(true);
    setLiveRouting(null);
    setLiveStatus("");
    setLiveFallback(null);
    setStreamingText("");

    const ac = new AbortController();
    abortRef.current = ac;

    // Build conversation payload
    const history = [...messages.filter((m) => m.role !== "system" || m.content.startsWith("Welcome")), userMsg]
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/router/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          stream: true,
          manualModelId: manualMode ? undefined : undefined, // manual mode handled separately if needed
          preferReal: true,
          temperature: 0.7,
          maxTokens: 800,
        }),
        signal: ac.signal,
      });

      if (!res.body) throw new Error("no stream body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let latestRouting: RoutingMeta | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as StreamEvent;
            handleEvent(evt, (text) => { acc += text; setStreamingText(acc); });
            if (evt.type === "meta") { latestRouting = evt.routing; setLiveRouting(evt.routing); }
            if (evt.type === "status") setLiveStatus(evt.message);
            if (evt.type === "fallback") setLiveFallback({ from: evt.from, to: evt.to, reason: evt.reason });
            if (evt.type === "done") {
              const finalText = acc;
              const routing = latestRouting
                ? { ...latestRouting, selectedModel: evt.model, fallbackUsed: evt.fallbackUsed }
                : undefined;
              setMessages((m) => [...m, { role: "assistant", content: finalText, routing }]);
              setStreamingText("");
            }
          } catch { /* ignore parse errors for partial */ }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ Error: ${e.message}` }]);
      }
    } finally {
      setStreaming(false);
      setLiveStatus("");
      abortRef.current = null;
    }
  };

  const handleEvent = (evt: StreamEvent, append: (t: string) => void) => {
    switch (evt.type) {
      case "token": append(evt.content); break;
      default: break;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    if (streamingText) {
      setMessages((m) => [...m, { role: "assistant", content: streamingText + " …[stopped]" }]);
      setStreamingText("");
    }
  };

  const reset = () => {
    setMessages([{ role: "system", content: "Conversation cleared. Send a new prompt." }]);
    setLiveRouting(null);
    setLiveFallback(null);
    setStreamingText("");
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      {/* Chat panel */}
      <Card className="flex flex-col h-[640px] overflow-hidden border-border/60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">Router Playground</div>
              <div className="text-[11px] text-muted-foreground">Live streaming · automatic fallback · GLM backend</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Switch id="auto-fb" checked={autoFallback} onCheckedChange={setAutoFallback} className="scale-90" />
              <Label htmlFor="auto-fb" className="text-muted-foreground">Auto-fallback</Label>
            </div>
            <Button size="sm" variant="ghost" onClick={reset} className="h-7 gap-1 text-xs">
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {streaming && streamingText && (
            <MessageBubble msg={{ role: "assistant", content: streamingText }} streaming />
          )}
          {streaming && !streamingText && liveStatus && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
              <Loader2 className="h-3 w-3 animate-spin" /> {liveStatus}
            </div>
          )}
        </div>

        <div className="border-t border-border/60 p-3 space-y-2 bg-muted/20">
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setInput(p.text)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  {createElement(getIcon(p.icon), { className: "h-3 w-3" })} {p.label}
                </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
              }}
              placeholder="Ask anything — the router will detect intent and pick the best free model…"
              className="min-h-[52px] max-h-[120px] resize-none border-border/60 bg-background"
            />
            {streaming ? (
              <Button onClick={stop} variant="destructive" className="h-auto">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={send} disabled={!input.trim()} className="h-auto bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>⌘ + Enter to send</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Prompt cache active</span>
          </div>
        </div>
      </Card>

      {/* Routing visualization */}
      <Card className="h-[640px] overflow-hidden flex flex-col border-border/60">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Live Routing Decision</span>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <AnimatePresence mode="wait">
              {liveRouting ? (
                <motion.div
                  key="routing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Intent */}
                  <div className="rounded-lg border border-border/60 p-3 space-y-2 bg-background/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      <Brain className="h-3 w-3" /> Detected Intent
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {liveRouting.intent.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(liveRouting.intent.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <CapRow icon="Gauge" label="Complexity" value={liveRouting.intent.complexity} />
                      <CapRow icon="Layers" label="Est. tokens" value={liveRouting.intent.estimatedTokens.toLocaleString()} />
                      <CapRow icon="ScrollText" label="Context needed" value={`${(liveRouting.intent.contextSizeNeeded / 1000).toFixed(0)}K`} />
                      <CapRow icon="Eye" label="Vision" value={liveRouting.intent.requiresVision ? "yes" : "no"} />
                      <CapRow icon="Webhook" label="Tools" value={liveRouting.intent.requiresTools ? "yes" : "no"} />
                      <CapRow icon="Database" label="JSON" value={liveRouting.intent.requiresJson ? "yes" : "no"} />
                    </div>
                    {liveRouting.intent.signals.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {liveRouting.intent.signals.slice(0, 4).map((s: string, i: number) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected */}
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 uppercase tracking-wide">
                        <Zap className="h-3 w-3" /> Selected Model
                      </div>
                      {liveRouting.cached && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">
                          <Database className="h-2.5 w-2.5 mr-1" /> cache hit
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: providerColor(modelProvider(liveRouting.selectedModel)) }}>
                        {liveRouting.selectedModel.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{liveRouting.selectedModel}</div>
                        <div className="text-[11px] text-muted-foreground">{modelProvider(liveRouting.selectedModel)}</div>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    {liveRouting.reasons.length > 0 && (
                      <ul className="space-y-1 pt-1">
                        {liveRouting.reasons.slice(0, 4).map((r, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <ArrowRight className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" /> {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Fallback chain */}
                  <div className="rounded-lg border border-border/60 p-3 space-y-2 bg-background/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        <ShieldCheck className="h-3 w-3" /> Fallback Chain
                      </div>
                      <span className="text-[10px] text-muted-foreground">{liveRouting.fallbackChain.length} backups</span>
                    </div>
                    <div className="space-y-1.5">
                      {liveRouting.fallbackChain.map((f, i) => (
                        <div key={f.modelId} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-4 text-right">{i + 1}</span>
                          <div className="h-6 w-6 rounded flex items-center justify-center text-white text-[9px] font-bold"
                            style={{ background: providerColor(f.provider) }}>
                            {f.modelId.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium truncate flex-1">{f.displayName}</span>
                          {f.isReal && <Badge variant="outline" className="text-[9px] h-4 px-1 border-emerald-500/40 text-emerald-600">LIVE</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {liveFallback && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-yellow-600 uppercase tracking-wide mb-1">
                        <AlertTriangle className="h-3 w-3" /> Fallback Triggered
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono text-foreground">{liveFallback.from}</span>
                        {liveFallback.to ? <> → <span className="font-mono text-foreground">{liveFallback.to}</span></> : null}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">{liveFallback.reason}</div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mb-3">
                    <Activity className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="text-sm font-medium">Awaiting prompt</div>
                  <div className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                    Send a message to see intent detection, candidate scoring, and the fallback chain in real time.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

function CapRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {createElement(getIcon(icon), { className: "h-3 w-3 text-muted-foreground" })}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function modelProvider(id: string): string {
  // Best-effort provider guess for color — real lookup happens server-side.
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

function MessageBubble({ msg, streaming }: { msg: ChatMsg; streaming?: boolean }) {
  if (msg.role === "system") {
    return (
      <div className="flex justify-center">
        <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-full px-3 py-1 max-w-md text-center">
          {msg.content}
        </div>
      </div>
    );
  }
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] font-bold ${
        isUser ? "bg-slate-700" : "bg-gradient-to-br from-emerald-500 to-teal-600"
      }`}>
        {isUser ? "YOU" : "AI"}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser ? "bg-slate-100 dark:bg-slate-800 text-foreground" : "bg-background border border-border/60"
      }`}>
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">
            {msg.content}
            {streaming && <span className="inline-block w-1.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse align-middle" />}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0 [&_strong]:text-foreground">
            <ReactMarkdown components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            }}>
              {msg.content}
            </ReactMarkdown>
            {streaming && <span className="inline-block w-1.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse align-middle" />}
          </div>
        )}
        {!isUser && msg.routing && (
          <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {msg.routing.selectedModel}
            </Badge>
            {msg.routing.fallbackUsed && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 border-yellow-500/40 text-yellow-600">
                fallback
              </Badge>
            )}
            {msg.routing.cached && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 border-emerald-500/40 text-emerald-600">
                cached
              </Badge>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
