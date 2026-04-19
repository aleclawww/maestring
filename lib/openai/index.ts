import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ─── Modelos configurados ─────────────────────────────────────────────────────

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

// ─── Embeddings para búsqueda semántica ──────────────────────────────────────

/**
 * Genera embeddings para un texto dado.
 * Usados para búsqueda semántica de preguntas similares.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, " "),
    dimensions: 1536, // text-embedding-3-small usa 1536 por defecto
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("Failed to generate embedding");
  }

  return embedding;
}

/**
 * Genera embeddings en batch para múltiples textos.
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.replace(/\n/g, " ")),
  });

  return response.data.map((d) => d.embedding);
}

// ─── Explicaciones de preguntas ───────────────────────────────────────────────

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
 * Genera una explicación personalizada de por qué una respuesta es correcta/incorrecta.
 */
export async function generateExplanation(
  request: ExplanationRequest
): Promise<string> {
  const wasCorrect =
    JSON.stringify(request.selectedOptionIds.sort()) ===
    JSON.stringify(request.correctOptionIds.sort());

  const prompt = `Eres un experto en certificaciones AWS, especialmente AWS Solutions Architect Associate (SAA-C03).
Tu tarea es explicar una pregunta del examen de forma clara, educativa y concisa.

PREGUNTA:
${request.questionText}

OPCIONES:
${request.options.map((o) => `${o.id}. ${o.text}`).join("\n")}

RESPUESTA CORRECTA: ${request.correctOptionIds.join(", ")}
RESPUESTA DEL ESTUDIANTE: ${request.selectedOptionIds.join(", ")} (${wasCorrect ? "CORRECTA ✓" : "INCORRECTA ✗"})

DOMINIO: ${request.domain}
SERVICIOS AWS INVOLUCRADOS: ${request.services.join(", ")}

Por favor:
1. Explica POR QUÉ la respuesta correcta es correcta (con detalles técnicos precisos)
2. Explica por qué las otras opciones son incorrectas (sin ser redundante)
3. Da un tip memorable o mnemónico para recordar este concepto en el futuro
4. Si hay algún escenario de uso real donde esto aplica, mencionarlo brevemente

Usa formato markdown. Sé conciso pero completo. No superes 400 palabras.`;

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
  });

  return response.choices[0]?.message?.content ?? "No se pudo generar la explicación.";
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

/**
 * Estima el número de tokens de un texto (aproximación).
 * Para cálculos exactos usar tiktoken.
 */
export function estimateTokens(text: string): number {
  // Aproximación: ~4 caracteres por token para inglés
  return Math.ceil(text.length / 4);
}
