// Intent Detection + Intelligent Routing Engine.
// All decisions are derived from model metadata — never hardcoded.

import { MODEL_REGISTRY, ModelCapability } from "./registry";

export type IntentResult = {
  intent: string;
  label: string;
  confidence: number;
  signals: string[];
  requiresVision: boolean;
  requiresTools: boolean;
  requiresJson: boolean;
  estimatedTokens: number;
  complexity: "low" | "medium" | "high";
  contextSizeNeeded: number;
};

// Lightweight, deterministic intent classifier (no external API needed).
const INTENT_RULES: Array<{
  intent: string;
  patterns: RegExp[];
  weight: number;
  requiresVision?: boolean;
  requiresTools?: boolean;
  requiresJson?: boolean;
}> = [
  { intent: "coding", patterns: [/\b(code|function|class|implement|refactor|typescript|python|javascript|java|rust|go|c\+\+|api endpoint)\b/i], weight: 2 },
  { intent: "debugging", patterns: [/\b(bug|error|stack trace|exception|crash|not working|fix|debug|traceback|null pointer)\b/i], weight: 2 },
  { intent: "code_review", patterns: [/\b(review|code review|pr|pull request|lint|clean code|smell)\b/i], weight: 2 },
  { intent: "architecture", patterns: [/\b(architect|design pattern|microservice|monolith|scalability|system design|ddd|event driven)\b/i], weight: 2 },
  { intent: "reasoning", patterns: [/\b(why|explain|reason|analyze|deduce|prove|because|therefore|step by step|think)\b/i], weight: 1.5 },
  { intent: "mathematics", patterns: [/\b(solve|equation|integral|derivative|matrix|theorem|prove|calculus|algebra|geometry|probability|combinatorics)\b/i], weight: 2 },
  { intent: "creative_writing", patterns: [/\b(story|poem|novel|character|plot|script|screenplay|creative|write a|imagine)\b/i], weight: 2 },
  { intent: "translation", patterns: [/\b(translate|translation|in (english|chinese|spanish|french|german|japanese)|convert to)\b/i], weight: 3, requiresJson: false },
  { intent: "research", patterns: [/\b(research|cite|sources|literature|survey|compare papers|state of the art)\b/i], weight: 2 },
  { intent: "summarization", patterns: [/\b(summarize|summary|tl;?dr|abstract|condense|key points)\b/i], weight: 3 },
  { intent: "ocr", patterns: [/\b(ocr|extract text|read image|scan document|receipt)\b/i], weight: 3, requiresVision: true },
  { intent: "vision", patterns: [/\b(image|picture|photo|screenshot|diagram|chart|see this|describe the|visualize)\b/i], weight: 2, requiresVision: true },
  { intent: "long_context", patterns: [/\b(entire document|whole file|large file|book|long conversation|100k|1m tokens|massive)\b/i], weight: 2 },
  { intent: "tool_calling", patterns: [/\b(tool|search the web|run command|execute|call api|use function)\b/i], weight: 2, requiresTools: true },
  { intent: "function_calling", patterns: [/\b(function call|invoke|webhook|tool use|agent tool)\b/i], weight: 2, requiresTools: true },
  { intent: "json_generation", patterns: [/\b(json|json schema|structured output|parseable|machine readable)\b/i], weight: 3, requiresJson: true },
  { intent: "sql", patterns: [/\b(sql|query|select|join|postgresql|mysql|database table|schema)\b/i], weight: 2, requiresJson: true },
  { intent: "data_analysis", patterns: [/\b(data analysis|analyze data|dataframe|pandas|statistics|correlation|regression|trend)\b/i], weight: 2 },
  { intent: "agent_tasks", patterns: [/\b(agent|autonomous|multi-step|plan and execute|workflow|orchestrate)\b/i], weight: 2, requiresTools: true },
  { intent: "rag", patterns: [/\b(rag|retrieval|knowledge base|embeddings|vector|semantic search|grounded)\b/i], weight: 2 },
  { intent: "planning", patterns: [/\b(plan|roadmap|milestone|schedule|break down|steps to)\b/i], weight: 2 },
  { intent: "education", patterns: [/\b(teach|explain to a (student|child)|lesson|tutorial|learn|course)\b/i], weight: 1.5 },
  { intent: "legal", patterns: [/\b(legal|contract|clause|compliance|gdpr|liability|jurisdiction)\b/i], weight: 3 },
  { intent: "finance", patterns: [/\b(finance|financial|stock|portfolio|valuation|roi|cash flow|accounting)\b/i], weight: 2 },
  { intent: "medical", patterns: [/\b(medical|diagnosis|symptom|treatment|disease|clinical|patient|dosage)\b/i], weight: 3 },
  { intent: "brainstorming", patterns: [/\b(brainstorm|ideas|ideate|come up with|generate options)\b/i], weight: 2 },
];

const INTENT_LABELS: Record<string, string> = {
  general_chat: "General Chat",
  coding: "Coding", debugging: "Debugging", code_review: "Code Review",
  architecture: "Software Architecture", reasoning: "Reasoning",
  mathematics: "Mathematics", creative_writing: "Creative Writing",
  translation: "Translation", research: "Research", summarization: "Summarization",
  ocr: "OCR", vision: "Vision", long_context: "Long Context",
  tool_calling: "Tool Calling", function_calling: "Function Calling",
  json_generation: "JSON Generation", sql: "SQL", data_analysis: "Data Analysis",
  agent_tasks: "Agent Tasks", rag: "RAG", planning: "Planning",
  education: "Education", legal: "Legal", finance: "Finance",
  medical: "Medical", brainstorming: "Brainstorming",
};

export function detectIntent(prompt: string): IntentResult {
  const text = prompt.toLowerCase();
  const scores = new Map<string, { score: number; signals: string[] }>();

  for (const rule of INTENT_RULES) {
    let matched = 0;
    const signals: string[] = [];
    for (const p of rule.patterns) {
      if (p.test(text)) {
        matched++;
        signals.push(p.source);
      }
    }
    if (matched > 0) {
      scores.set(rule.intent, { score: matched * rule.weight, signals });
    }
  }

  let topIntent = "general_chat";
  let topScore = 0;
  let topSignals: string[] = [];
  for (const [intent, { score, signals }] of scores) {
    if (score > topScore) {
      topScore = score;
      topIntent = intent;
      topSignals = signals;
    }
  }

  const confidence = topScore === 0 ? 0.4 : Math.min(0.99, 0.5 + topScore * 0.12);

  // Aggregate capability requirements across all matched intents.
  let requiresVision = false;
  let requiresTools = false;
  let requiresJson = false;
  for (const rule of INTENT_RULES) {
    if (scores.has(rule.intent)) {
      if (rule.requiresVision) requiresVision = true;
      if (rule.requiresTools) requiresTools = true;
      if (rule.requiresJson) requiresJson = true;
    }
  }

  const estimatedTokens = Math.ceil(prompt.length / 3.8);
  const complexity =
    estimatedTokens > 4000 || topScore >= 6 ? "high" :
    estimatedTokens > 800 || topScore >= 3 ? "medium" : "low";

  // Context size needed (with room for response + future turns).
  const contextSizeNeeded = Math.min(
    10000000,
    Math.max(8000, Math.ceil((estimatedTokens * 4) / 1000) * 1000)
  );

  return {
    intent: topIntent,
    label: INTENT_LABELS[topIntent] || "General Chat",
    confidence,
    signals: topSignals.slice(0, 5),
    requiresVision,
    requiresTools,
    requiresJson,
    estimatedTokens,
    complexity,
    contextSizeNeeded,
  };
}

// Routing weights — tunable.
const WEIGHTS = {
  benchmark: 0.28,
  health: 0.22,
  speed: 0.12,
  quality: 0.10,
  intentFit: 0.20,
  context: 0.04,
  cost: 0.04,
};

export type RoutingCandidate = {
  model: ModelCapability;
  score: number;
  breakdown: {
    benchmark: number;
    health: number;
    speed: number;
    quality: number;
    intentFit: number;
    context: number;
    cost: number;
  };
  eligible: boolean;
  reasons: string[];
};

export type RoutingDecision = {
  intent: IntentResult;
  candidates: RoutingCandidate[];
  selected: RoutingCandidate;
  fallbackChain: RoutingCandidate[];
  timestamp: number;
};

function intentFitScore(model: ModelCapability, intent: IntentResult): number {
  let s = 50;
  switch (intent.intent) {
    case "coding":
    case "code_review":
      s = model.codingScore; break;
    case "debugging":
      s = model.codingScore * 0.7 + model.reasoningScore * 0.3; break;
    case "architecture":
      s = model.reasoningScore * 0.6 + model.codingScore * 0.4; break;
    case "reasoning":
      s = model.reasoningScore; break;
    case "mathematics":
      s = model.mathScore; break;
    case "creative_writing":
      s = model.writingScore; break;
    case "translation":
      s = model.multilingualScore * 0.7 + model.qualityScore * 0.3; break;
    case "summarization":
      s = model.qualityScore * 0.6 + model.speedScore * 0.4; break;
    case "vision":
    case "ocr":
      s = model.visionSupport ? model.qualityScore : 0; break;
    case "long_context":
      s = model.contextLength >= 128000 ? model.qualityScore : model.qualityScore * 0.3; break;
    case "tool_calling":
    case "function_calling":
    case "agent_tasks":
      s = (model.toolCalling ? 60 : 0) + (model.functionCalling ? 40 : 0) + model.reasoningScore * 0.2; break;
    case "json_generation":
    case "sql":
      s = (model.jsonMode ? 50 : 0) + (model.structuredOutput ? 30 : 0) + model.qualityScore * 0.2; break;
    case "data_analysis":
    case "research":
      s = model.reasoningScore * 0.6 + model.qualityScore * 0.4; break;
    case "rag":
      s = (model.embeddingSupport ? 60 : model.qualityScore) * 0.4 + model.qualityScore * 0.6; break;
    case "planning":
      s = model.reasoningScore * 0.7 + model.qualityScore * 0.3; break;
    case "education":
      s = model.writingScore * 0.5 + model.qualityScore * 0.5; break;
    case "legal":
    case "finance":
    case "medical":
      s = model.reasoningScore * 0.5 + model.qualityScore * 0.5; break;
    case "brainstorming":
      s = model.writingScore * 0.6 + model.qualityScore * 0.4; break;
    default:
      s = model.qualityScore * 0.6 + model.writingScore * 0.2 + model.speedScore * 0.2;
  }
  return Math.min(100, s);
}

export function routeRequest(
  prompt: string,
  opts?: { preferReal?: boolean; excludeIds?: string[]; requireStreaming?: boolean }
): RoutingDecision {
  const intent = detectIntent(prompt);
  const exclude = new Set(opts?.excludeIds ?? []);

  const candidates: RoutingCandidate[] = MODEL_REGISTRY
    .filter((m) => m.freeOrPaid === "free")
    .filter((m) => !exclude.has(m.id))
    .filter((m) => intent.requiresVision ? m.visionSupport : true)
    .filter((m) => intent.requiresTools ? (m.toolCalling || m.functionCalling) : true)
    .filter((m) => intent.requiresJson ? m.jsonMode : true)
    .filter((m) => m.contextLength >= intent.contextSizeNeeded || intent.contextSizeNeeded <= 8000)
    .filter((m) => opts?.requireStreaming ? m.streaming : true)
    .map((model) => {
      const intentFit = intentFitScore(model, intent);
      const ctxOk = model.contextLength >= intent.estimatedTokens * 2;
      const contextScore = ctxOk
        ? Math.min(100, (model.contextLength / Math.max(intent.estimatedTokens * 2, 1)) * 10)
        : 20;
      const costScore = model.freeOrPaid === "free" ? 100 : 60;

      const breakdown = {
        benchmark: model.benchmarkScore,
        health: model.healthScore,
        speed: model.speedScore,
        quality: model.qualityScore,
        intentFit,
        context: Math.min(100, contextScore),
        cost: costScore,
      };

      const score =
        breakdown.benchmark * WEIGHTS.benchmark +
        breakdown.health * WEIGHTS.health +
        breakdown.speed * WEIGHTS.speed +
        breakdown.quality * WEIGHTS.quality +
        breakdown.intentFit * WEIGHTS.intentFit +
        breakdown.context * WEIGHTS.context +
        breakdown.cost * WEIGHTS.cost;

      const reasons: string[] = [];
      if (model.isReal) reasons.push("Live backend available (z-ai-web-dev-sdk)");
      if (breakdown.intentFit >= 85) reasons.push(`Excellent ${intent.label.toLowerCase()} fit (${breakdown.intentFit.toFixed(0)})`);
      if (breakdown.health >= 95) reasons.push(`Healthy (${breakdown.health.toFixed(0)})`);
      if (model.contextLength >= 128000) reasons.push(`${(model.contextLength / 1000).toFixed(0)}K context`);
      if (model.speedScore >= 90) reasons.push("Very fast");
      if (model.streaming) reasons.push("Streaming supported");

      const eligible = breakdown.health >= 60 && breakdown.intentFit >= 30;

      return { model, score, breakdown, eligible, reasons };
    })
    .sort((a, b) => b.score - a.score);

  // Prefer real models when tied closely (so the playground actually streams live).
  if (opts?.preferReal !== false) {
    candidates.sort((a, b) => {
      if (a.model.isReal !== b.model.isReal) return a.model.isReal ? -1 : 1;
      return b.score - a.score;
    });
  }

  const selected = candidates[0] ?? candidates[0];
  // Fallback chain: top 5 eligible excluding the selected.
  const fallbackChain = candidates
    .filter((c) => c.eligible && c.model.id !== selected?.model.id)
    .slice(0, 5);

  return {
    intent,
    candidates,
    selected,
    fallbackChain,
    timestamp: Date.now(),
  };
}
