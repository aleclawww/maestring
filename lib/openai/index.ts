import OpenAI from "openai";

// Lazy-initialised singleton — throws with a clear message if OPENAI_API_KEY
// is not set, rather than failing obscurely inside the SDK constructor.
let _client: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is required but not set");
  _client = new OpenAI({ apiKey });
  return _client;
}

// Named export kept for backward compatibility with callers that import
// `openai` directly.  Using a getter function internally keeps module load
// side-effect-free (safe for builds without the key present).
export { getOpenAI as openai };

const EMBEDDING_MODEL = process.env["OPENAI_EMBEDDING_MODEL"] ?? "text-embedding-3-small";
const CHAT_MODEL = process.env["OPENAI_CHAT_MODEL"] ?? "gpt-4o-mini";

// ─── Embeddings for semantic search ──────────────────────────────────────────

/** Generates an embedding vector for the given text. */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, " "),
    dimensions: 1536,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("Failed to generate embedding");
  }

  return embedding;
}

/** Generates embeddings in batch for multiple texts. */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.replace(/\n/g, " ")),
  });

  return response.data.map((d) => d.embedding);
}

// ─── Question explanations ────────────────────────────────────────────────────

export interface ExplanationRequest {
  questionText: string;
  options: Array<{ id: string; text: string }>;
  correctOptionIds: string[];
  selectedOptionIds: string[];
  domain: string;
  services: string[];
  userContext?: string;
}

/**
 * Generates a personalised explanation for why an answer is correct or incorrect.
 * Used by the /api/study/elaborate endpoint.
 */
export async function generateExplanation(
  request: ExplanationRequest
): Promise<string> {
  const wasCorrect =
    JSON.stringify(request.selectedOptionIds.sort()) ===
    JSON.stringify(request.correctOptionIds.sort());

  const prompt = `You are an AWS certification expert, specialising in AWS Solutions Architect Associate (SAA-C03).
Your task is to explain an exam question clearly, educationally, and concisely.

QUESTION:
${request.questionText}

OPTIONS:
${request.options.map((o) => `${o.id}. ${o.text}`).join("\n")}

CORRECT ANSWER: ${request.correctOptionIds.join(", ")}
STUDENT ANSWER: ${request.selectedOptionIds.join(", ")} (${wasCorrect ? "CORRECT ✓" : "INCORRECT ✗"})

DOMAIN: ${request.domain}
AWS SERVICES INVOLVED: ${request.services.join(", ")}

Please:
1. Explain WHY the correct answer is correct (with precise technical detail)
2. Explain why the other options are wrong (without being redundant)
3. Give a memorable tip or mnemonic to remember this concept in future
4. Briefly mention a real-world scenario where this applies, if relevant

Use markdown formatting. Be concise but complete. Do not exceed 400 words.`;

  const response = await getOpenAI().chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
  });

  return response.choices[0]?.message?.content ?? "Could not generate explanation.";
}

// ─── Token estimation ─────────────────────────────────────────────────────────

/**
 * Estimates the token count for a text string (approximation).
 * For exact counts use tiktoken.
 */
export function estimateTokens(text: string): number {
  // ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}
