import Anthropic from "@anthropic-ai/sdk";
import { CONCEPTS } from "@/lib/knowledge-graph/aws-saa";
import { logger } from "@/lib/logger";
import { recordLlmUsage } from "@/lib/llm/usage";

const MODEL = "claude-haiku-4-5-20251001";

type ConceptLink = {
  conceptId: string;
  conceptName: string;
  confidence: number;
  matchType: "keyword" | "ai";
};

// Build a keyword map from concept data
const KEYWORD_MAP: Map<string, string> = new Map();

for (const concept of CONCEPTS) {
  const keywords = [
    concept.name.toLowerCase(),
    ...(concept.awsServices ?? []).map((s: string) => s.toLowerCase()),
  ];
  for (const kw of keywords) {
    KEYWORD_MAP.set(kw, concept.slug);
  }
}

export async function linkChunkToConcepts(chunkContent: string): Promise<ConceptLink[]> {
  const links: ConceptLink[] = [];
  const lowerContent = chunkContent.toLowerCase();

  // 1. Keyword matching (fast)
  const matched = new Set<string>();
  for (const [kw, conceptId] of KEYWORD_MAP.entries()) {
    if (lowerContent.includes(kw)) {
      if (!matched.has(conceptId)) {
        const concept = CONCEPTS.find((c) => c.slug === conceptId);
        if (concept) {
          links.push({ conceptId, conceptName: concept.name, confidence: 0.7, matchType: "keyword" });
          matched.add(conceptId);
        }
      }
    }
  }

  // 2. AI fallback if no keyword matches
  if (links.length === 0) {
    const t0 = Date.now();
    try {
      const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
      const conceptList = CONCEPTS.map((c) => `${c.slug}: ${c.name}`).join("\n");
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Given this AWS documentation excerpt, identify up to 3 relevant AWS concepts from the list.
Return a JSON array of concept IDs. Return [] if none apply.

CONCEPTS:
${conceptList}

EXCERPT:
${chunkContent.slice(0, 500)}

JSON array only:`,
          },
        ],
      });

      recordLlmUsage({
        userId: null,
        route: "ingestion.concept-linker",
        model: MODEL,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        latencyMs: Date.now() - t0,
        success: true,
      });

      const text = message.content[0]?.type === "text" ? message.content[0].text : "[]";
      const ids: string[] = JSON.parse(text.match(/\[.*\]/s)?.[0] ?? "[]");

      for (const id of ids) {
        const concept = CONCEPTS.find((c) => c.slug === id);
        if (concept && !matched.has(id)) {
          links.push({ conceptId: id, conceptName: concept.name, confidence: 0.85, matchType: "ai" });
        }
      }
    } catch (err) {
      // Fallback to keyword-only (i.e. empty link set when no keywords hit)
      // is intentional — concept linking is a soft enrichment and missing
      // links don't break ingestion. But silent fall-through hides quota
      // exhaustion, rate-limit spikes, and JSON drift, so we log AND record
      // a failed usage row for dashboards/alerts (same pattern as
      // elaborateAnswer).
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        { err: error.message, errorName: error.name },
        "AI concept linking failed, skipping",
      );
      recordLlmUsage({
        userId: null,
        route: "ingestion.concept-linker",
        model: MODEL,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - t0,
        success: false,
        errorCode: error.name || "unknown_error",
      });
    }
  }

  return links;
}
