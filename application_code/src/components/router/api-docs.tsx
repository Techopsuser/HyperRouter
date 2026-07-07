"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Code2, Copy, Check, Terminal, Webhook, KeyRound, BookOpen } from "lucide-react";

const ENDPOINTS = [
  { method: "POST", path: "/v1/chat/completions", desc: "OpenAI-compatible chat (streaming + fallback)", color: "emerald" },
  { method: "POST", path: "/v1/completions", desc: "Legacy text completions", color: "emerald" },
  { method: "POST", path: "/v1/embeddings", desc: "Embeddings (BGE / Nomic)", color: "emerald" },
  { method: "GET", path: "/v1/models", desc: "List all registered models", color: "sky" },
  { method: "GET", path: "/health", desc: "Platform health summary", color: "sky" },
  { method: "GET", path: "/metrics", desc: "Prometheus metrics", color: "sky" },
  { method: "GET", path: "/benchmarks", desc: "Per-category benchmark scores", color: "sky" },
  { method: "GET", path: "/api/router/preview", desc: "Preview routing decision (no call)", color: "violet" },
];

const SNIPPETS = {
  curl: `curl -N https://hyperrouter.local/v1/chat/completions \\
  -H "Authorization: Bearer $HYPERROUTER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto",
    "messages": [
      {"role": "user", "content": "Refactor this React component for performance."}
    ],
    "stream": true
  }'`,
  python: `from openai import OpenAI

client = OpenAI(
    base_url="https://hyperrouter.local/v1",
    api_key=os.environ["HYPERROUTER_API_KEY"],
)

stream = client.chat.completions.create(
    model="auto",  # let the router decide
    messages=[{"role": "user", "content": "Explain RAFT consensus."}],
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`,
  typescript: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://hyperrouter.local/v1",
  apiKey: process.env.HYPERROUTER_API_KEY!,
});

const stream = await client.chat.completions.create({
  model: "auto",
  messages: [{ role: "user", content: "Generate a SQL schema for users + posts." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`,
};

type Lang = keyof typeof SNIPPETS;

export default function ApiDocs() {
  const [lang, setLang] = useState<Lang>("curl");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(SNIPPETS[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-4 border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">OpenAI-Compatible API</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Hyperrouter exposes a fully OpenAI-compatible surface. Point any existing OpenAI client at the base URL, set <code className="text-[11px] bg-muted px-1 py-0.5 rounded">model: "auto"</code>, and the router handles intent detection, scoring, fallback, caching, and streaming transparently.
        </p>
        <div className="space-y-1.5">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/40 transition-colors">
              <Badge variant="outline" className={`text-[9px] font-mono w-12 justify-center ${
                e.color === "emerald" ? "border-emerald-500/40 text-emerald-600" :
                e.color === "sky" ? "border-sky-500/40 text-sky-600" :
                "border-violet-500/40 text-violet-600"
              }`}>{e.method}</Badge>
              <code className="text-[11px] font-mono flex-1">{e.path}</code>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">{e.desc}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <KeyRound className="h-3.5 w-3.5 text-amber-500" /> Authentication
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pass your API key as <code className="text-[10px] bg-muted px-1 py-0.5 rounded">Authorization: Bearer $HYPERROUTER_API_KEY</code>. Keys are scoped with roles and per-minute rate limits.
          </p>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Webhook className="h-3.5 w-3.5 text-violet-500" /> Webhooks
          </div>
          <p className="text-[11px] text-muted-foreground">
            Subscribe to <code className="text-[10px] bg-muted px-1 py-0.5 rounded">request.completed</code>, <code className="text-[10px] bg-muted px-1 py-0.5 rounded">fallback.triggered</code>, and <code className="text-[10px] bg-muted px-1 py-0.5 rounded">health.changed</code> events.
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/60">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-medium">Quickstart</span>
          </div>
          <div className="flex items-center gap-1">
            {(Object.keys(SNIPPETS) as Lang[]).map((l) => (
              <Button
                key={l}
                size="sm"
                variant={lang === l ? "default" : "ghost"}
                onClick={() => setLang(l)}
                className="h-6 text-[11px] px-2"
              >
                {l === "curl" ? "cURL" : l === "python" ? "Python" : "TypeScript"}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={copy} className="h-6 text-[11px] px-2">
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        <pre className="p-4 text-[11px] leading-relaxed font-mono overflow-x-auto bg-slate-950 text-slate-100 max-h-[420px] overflow-y-auto">
          <code>{SNIPPETS[lang]}</code>
        </pre>
        <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">model: "auto"</span> triggers the router. You can also pin a model explicitly — manual mode bypasses scoring but keeps fallback.
        </div>
      </Card>
    </div>
  );
}
