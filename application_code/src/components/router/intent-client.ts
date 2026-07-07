"use client";

// Lightweight client-side mirror of the server intent detector for instant UI feedback.

const RULES: Array<{ intent: string; patterns: RegExp[]; weight: number; vision?: boolean; tools?: boolean; json?: boolean }> = [
  { intent: "coding", patterns: [/\b(code|function|class|implement|refactor|typescript|python|javascript|java|rust|api endpoint)\b/i], weight: 2 },
  { intent: "debugging", patterns: [/\b(bug|error|stack trace|exception|crash|not working|fix|debug|traceback)\b/i], weight: 2 },
  { intent: "code_review", patterns: [/\b(review|code review|pr|pull request|lint|clean code)\b/i], weight: 2 },
  { intent: "architecture", patterns: [/\b(architect|design pattern|microservice|monolith|scalability|system design)\b/i], weight: 2 },
  { intent: "reasoning", patterns: [/\b(why|explain|reason|analyze|deduce|prove|because|therefore|step by step|think)\b/i], weight: 1.5 },
  { intent: "mathematics", patterns: [/\b(solve|equation|integral|derivative|matrix|theorem|prove|calculus|algebra|geometry|probability)\b/i], weight: 2 },
  { intent: "creative_writing", patterns: [/\b(story|poem|novel|character|plot|script|screenplay|creative|write a|imagine)\b/i], weight: 2 },
  { intent: "translation", patterns: [/\b(translate|translation|in (english|chinese|spanish|french|german|japanese))\b/i], weight: 3 },
  { intent: "research", patterns: [/\b(research|cite|sources|literature|survey|compare papers)\b/i], weight: 2 },
  { intent: "summarization", patterns: [/\b(summarize|summary|tl;?dr|abstract|condense|key points)\b/i], weight: 3 },
  { intent: "ocr", patterns: [/\b(ocr|extract text|read image|scan document)\b/i], weight: 3, vision: true },
  { intent: "vision", patterns: [/\b(image|picture|photo|screenshot|diagram|chart|describe the|visualize)\b/i], weight: 2, vision: true },
  { intent: "long_context", patterns: [/\b(entire document|whole file|large file|book|long conversation|100k|1m tokens|massive)\b/i], weight: 2 },
  { intent: "tool_calling", patterns: [/\b(tool|search the web|run command|execute|call api|use function)\b/i], weight: 2, tools: true },
  { intent: "function_calling", patterns: [/\b(function call|invoke|webhook|tool use|agent tool)\b/i], weight: 2, tools: true },
  { intent: "json_generation", patterns: [/\b(json|json schema|structured output|parseable|machine readable)\b/i], weight: 3, json: true },
  { intent: "sql", patterns: [/\b(sql|query|select|join|postgresql|mysql|database table|schema)\b/i], weight: 2, json: true },
  { intent: "data_analysis", patterns: [/\b(data analysis|analyze data|dataframe|pandas|statistics|correlation|regression)\b/i], weight: 2 },
  { intent: "agent_tasks", patterns: [/\b(agent|autonomous|multi-step|plan and execute|workflow|orchestrate)\b/i], weight: 2, tools: true },
  { intent: "rag", patterns: [/\b(rag|retrieval|knowledge base|embeddings|vector|semantic search|grounded)\b/i], weight: 2 },
  { intent: "planning", patterns: [/\b(plan|roadmap|milestone|schedule|break down|steps to)\b/i], weight: 2 },
  { intent: "education", patterns: [/\b(teach|explain to a (student|child)|lesson|tutorial|learn|course)\b/i], weight: 1.5 },
  { intent: "legal", patterns: [/\b(legal|contract|clause|compliance|gdpr|liability|jurisdiction)\b/i], weight: 3 },
  { intent: "finance", patterns: [/\b(finance|financial|stock|portfolio|valuation|roi|cash flow|accounting)\b/i], weight: 2 },
  { intent: "medical", patterns: [/\b(medical|diagnosis|symptom|treatment|disease|clinical|patient|dosage)\b/i], weight: 3 },
  { intent: "brainstorming", patterns: [/\b(brainstorm|ideas|ideate|come up with|generate options)\b/i], weight: 2 },
];

const LABELS: Record<string, string> = {
  general_chat: "General Chat", coding: "Coding", debugging: "Debugging", code_review: "Code Review",
  architecture: "Software Architecture", reasoning: "Reasoning", mathematics: "Mathematics",
  creative_writing: "Creative Writing", translation: "Translation", research: "Research",
  summarization: "Summarization", ocr: "OCR", vision: "Vision", long_context: "Long Context",
  tool_calling: "Tool Calling", function_calling: "Function Calling", json_generation: "JSON Generation",
  sql: "SQL", data_analysis: "Data Analysis", agent_tasks: "Agent Tasks", rag: "RAG", planning: "Planning",
  education: "Education", legal: "Legal", finance: "Finance", medical: "Medical", brainstorming: "Brainstorming",
};

export function detectIntentLocal(prompt: string) {
  const text = prompt.toLowerCase();
  const scores = new Map<string, number>();
  let vision = false, tools = false, json = false;
  for (const r of RULES) {
    let m = 0;
    for (const p of r.patterns) if (p.test(text)) m++;
    if (m > 0) {
      scores.set(r.intent, m * r.weight);
      if (r.vision) vision = true;
      if (r.tools) tools = true;
      if (r.json) json = true;
    }
  }
  let top = "general_chat", topScore = 0;
  for (const [k, v] of scores) if (v > topScore) { topScore = v; top = k; }
  const confidence = topScore === 0 ? 0.4 : Math.min(0.99, 0.5 + topScore * 0.12);
  const estimatedTokens = Math.ceil(prompt.length / 3.8);
  const complexity = estimatedTokens > 4000 || topScore >= 6 ? "high" : estimatedTokens > 800 || topScore >= 3 ? "medium" : "low";
  const contextSizeNeeded = Math.min(10000000, Math.max(8000, Math.ceil((estimatedTokens * 4) / 1000) * 1000));
  return {
    intent: top,
    label: LABELS[top] || "General Chat",
    confidence,
    requiresVision: vision,
    requiresTools: tools,
    requiresJson: json,
    estimatedTokens,
    complexity,
    contextSizeNeeded,
  };
}
