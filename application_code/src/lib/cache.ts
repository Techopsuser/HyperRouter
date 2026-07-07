// Prompt + Response cache (in-memory, prompt-hash based) — emulates semantic cache layer.

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

type CacheEntry = {
  hash: string;
  modelId: string;
  prompt: string;
  response: string;
  intent: string;
  createdAt: number;
  expiresAt: number;
  hits: number;
};

const globalForCache = globalThis as unknown as { __cache?: Map<string, CacheEntry> };
if (!globalForCache.__cache) globalForCache.__cache = new Map();

const TTL = 1000 * 60 * 30; // 30 minutes

export function cacheGet(prompt: string, modelId?: string): CacheEntry | undefined {
  const h = hash(prompt + (modelId ?? ""));
  const e = globalForCache.__cache!.get(h);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    globalForCache.__cache!.delete(h);
    return undefined;
  }
  e.hits += 1;
  return e;
}

export function cacheSet(prompt: string, modelId: string, response: string, intent: string) {
  const h = hash(prompt + modelId);
  globalForCache.__cache!.set(h, {
    hash: h, modelId, prompt, response, intent,
    createdAt: Date.now(), expiresAt: Date.now() + TTL, hits: 0,
  });
}

export function cacheStats() {
  const all = Array.from(globalForCache.__cache!.values());
  return {
    size: all.length,
    totalHits: all.reduce((a, e) => a + e.hits, 0),
    entries: all.sort((a, b) => b.hits - a.hits).slice(0, 8),
  };
}

export function cacheHash(prompt: string, modelId?: string) {
  return hash(prompt + (modelId ?? ""));
}
