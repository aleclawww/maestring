import { get_encoding } from "tiktoken";
import { cleanText } from "./pdf-extractor";
import { logger } from "@/lib/logger";

const CHUNK_SIZE_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 50;

export type TextChunk = {
  content: string;
  tokenCount: number;
  pageStart: number;
  pageEnd: number;
  chunkIndex: number;
};

export function chunkDocument(
  pages: Array<{ pageNumber: number; text: string }>,
  chunkSizeTokens = CHUNK_SIZE_TOKENS,
  overlapTokens = CHUNK_OVERLAP_TOKENS
): TextChunk[] {
  const enc = get_encoding("cl100k_base");
  const chunks: TextChunk[] = [];

  // Build a flat list of sentences with page metadata
  const sentences: Array<{ text: string; page: number }> = [];

  for (const page of pages) {
    const cleaned = cleanText(page.text);
    // Split on sentence boundaries
    const sentenceTexts = cleaned.split(/(?<=[.!?])\s+(?=[A-Z])/);
    for (const sentence of sentenceTexts) {
      if (sentence.trim().length > 10) {
        sentences.push({ text: sentence.trim(), page: page.pageNumber });
      }
    }
  }

  let currentChunk: typeof sentences = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  const flush = () => {
    if (currentChunk.length === 0) return;
    const content = currentChunk.map((s) => s.text).join(" ");
    chunks.push({
      content,
      tokenCount: currentTokens,
      pageStart: currentChunk[0]!.page,
      pageEnd: currentChunk[currentChunk.length - 1]!.page,
      chunkIndex: chunkIndex++,
    });
  };

  for (const sentence of sentences) {
    const tokens = enc.encode(sentence.text).length;

    if (currentTokens + tokens > chunkSizeTokens && currentChunk.length > 0) {
      flush();

      // Keep overlap: last N tokens worth of sentences
      let overlapTokenCount = 0;
      const overlap: typeof sentences = [];
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const s = currentChunk[i]!;
        const st = enc.encode(s.text).length;
        if (overlapTokenCount + st > overlapTokens) break;
        overlap.unshift(s);
        overlapTokenCount += st;
      }
      currentChunk = overlap;
      currentTokens = overlapTokenCount;
    }

    currentChunk.push(sentence);
    currentTokens += tokens;
  }

  flush();

  enc.free();

  logger.info({ chunks: chunks.length }, "Document chunked");
  return chunks;
}
