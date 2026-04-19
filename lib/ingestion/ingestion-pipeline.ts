import { createAdminClient } from "@/lib/supabase/admin";
import { extractPdfText } from "./pdf-extractor";
import { chunkDocument } from "./text-chunker";
import { generateEmbeddings } from "./embeddings-generator";
import { linkChunkToConcepts } from "./concept-linker";
import { logger } from "@/lib/logger";

export type PipelineOptions = {
  documentId: string;
  userId: string;
  storagePath: string;
};

export type PipelineResult = {
  chunksCreated: number;
  conceptLinksCreated: number;
  error?: string;
};

export async function runIngestionPipeline(opts: PipelineOptions): Promise<PipelineResult> {
  const { documentId, userId, storagePath } = opts;
  const supabase = createAdminClient();

  // Update status to processing
  await supabase
    .from("user_documents")
    .update({ processing_status: "processing" })
    .eq("id", documentId);

  try {
    // 1. Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("user-documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // 2. Extract text
    logger.info({ documentId }, "Extracting PDF text");
    const extracted = await extractPdfText(buffer);

    // 3. Chunk text
    logger.info({ documentId, pages: extracted.pages.length }, "Chunking document");
    const chunks = chunkDocument(extracted.pages);

    if (chunks.length === 0) {
      throw new Error("No text could be extracted from this PDF");
    }

    // 4. Generate embeddings in batches
    logger.info({ documentId, chunks: chunks.length }, "Generating embeddings");
    const texts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    // 5. Store chunks with embeddings
    logger.info({ documentId }, "Storing chunks");
    let chunksCreated = 0;
    const chunkIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const embedding = embeddings[i]!;

      const { data: savedChunk } = await supabase
        .from("content_chunks")
        .insert({
          document_id: documentId,
          user_id: userId,
          content: chunk.content,
          chunk_index: chunk.chunkIndex,
          token_count: chunk.tokenCount,
          page_start: chunk.pageStart,
          page_end: chunk.pageEnd,
          embedding: JSON.stringify(embedding),
        })
        .select("id")
        .single();

      if (savedChunk) {
        chunkIds.push(savedChunk.id);
        chunksCreated++;
      }
    }

    // 6. Link chunks to concepts
    logger.info({ documentId }, "Linking chunks to concepts");
    let conceptLinksCreated = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const chunkId = chunkIds[i];
      if (!chunkId) continue;

      const conceptLinks = await linkChunkToConcepts(chunk.content);
      for (const link of conceptLinks) {
        const { error } = await supabase.from("chunk_concept_links").insert({
          chunk_id: chunkId,
          concept_id: link.conceptId,
          confidence: link.confidence,
          match_type: link.matchType,
        });
        if (!error) conceptLinksCreated++;
      }
    }

    // 7. Mark completed
    await supabase
      .from("user_documents")
      .update({
        processing_status: "completed",
        chunk_count: chunksCreated,
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    logger.info(
      { documentId, chunksCreated, conceptLinksCreated },
      "Ingestion pipeline completed"
    );

    return { chunksCreated, conceptLinksCreated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err, documentId }, "Ingestion pipeline failed");

    await supabase
      .from("user_documents")
      .update({
        processing_status: "failed",
        error_message: message,
      })
      .eq("id", documentId);

    return { chunksCreated: 0, conceptLinksCreated: 0, error: message };
  }
}
