import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { sleep } from "@/lib/utils";

const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;
const RPM_LIMIT = 500;
const DELAY_BETWEEN_BATCHES_MS = Math.ceil((60 * 1000) / (RPM_LIMIT / BATCH_SIZE));

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
  }
  return openai;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAI();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    let attempts = 0;
    while (attempts < 3) {
      try {
        const response = await client.embeddings.create({
          model: MODEL,
          input: batch,
          encoding_format: "float",
        });
        const embeddings = response.data
          .sort((a, b) => a.index - b.index)
          .map((e) => e.embedding);
        allEmbeddings.push(...embeddings);
        break;
      } catch (err) {
        attempts++;
        if (attempts >= 3) throw err;
        const backoff = 1000 * Math.pow(2, attempts);
        logger.warn({ err, attempt: attempts, backoff }, "Embedding batch failed, retrying");
        await sleep(backoff);
      }
    }

    // Respect RPM limit between batches
    if (i + BATCH_SIZE < texts.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  logger.info({ count: allEmbeddings.length }, "Embeddings generated");
  return allEmbeddings;
}

export async function generateSingleEmbedding(text: string): Promise<number[]> {
  const results = await generateEmbeddings([text]);
  return results[0]!;
}
