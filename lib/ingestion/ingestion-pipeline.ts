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

  // Update status to processing. Log on failure but don't abort — the pipeline
  // will still run and the "completed" update at the end will correct the
  // status. We just won't show intermediate progress to the user if this fails.
  const { error: processingStatusErr } = await supabase
    .from("user_documents")
    .update({ processing_status: "processing" })
    .eq("id", documentId);
  if (processingStatusErr) {
    logger.error(
      { err: processingStatusErr, documentId },
      "Failed to mark document as processing — proceeding anyway"
    );
  }

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

    // 5. Store chunks with embeddings. If an individual insert fails we log
    // and skip the chunk — previously this was fully silent which could leave
    // a document marked "completed" with `chunk_count: 0` when every insert
    // failed systemically. We now throw below if ZERO chunks landed so the
    // catch-branch flips the doc to "failed" instead of lying to the user.
    logger.info({ documentId }, "Storing chunks");
    let chunksCreated = 0;
    let chunkFailures = 0;
    const chunkIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const embedding = embeddings[i]!;

      const { data: savedChunk, error: chunkErr } = await supabase
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
      } else {
        chunkFailures++;
        logger.error(
          { err: chunkErr, documentId, chunkIndex: chunk.chunkIndex },
          "Failed to persist content chunk"
        );
      }
    }

    if (chunksCreated === 0 && chunks.length > 0) {
      // Every insert failed — likely a schema / RLS / disk problem rather than
      // a bad chunk. Surface as a pipeline failure so the catch branch below
      // flips the doc to "failed" and the user sees an actionable error
      // instead of a "completed" doc with no content.
      throw new Error(
        `All ${chunks.length} content_chunks inserts failed (${chunkFailures} failures) — see prior logs`
      );
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

    // 7. Mark completed. This is the must-commit path — the chunks are in the
    // DB regardless, so if we fail to flip the status the user sees a doc
    // stuck on "processing" forever despite the pipeline having succeeded.
    // Throw so the caller (and any retry loop) knows bookkeeping failed.
    const { error: completedStatusErr } = await supabase
      .from("user_documents")
      .update({
        processing_status: "completed",
        chunk_count: chunksCreated,
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    if (completedStatusErr) {
      logger.error(
        { err: completedStatusErr, documentId, chunksCreated, conceptLinksCreated },
        "Failed to mark document as completed — chunks were persisted but status is stuck"
      );
      throw new Error(
        `Failed to mark document completed: ${completedStatusErr.message ?? "unknown error"}`
      );
    }

    logger.info(
      { documentId, chunksCreated, conceptLinksCreated },
      "Ingestion pipeline completed"
    );

    return { chunksCreated, conceptLinksCreated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err, documentId }, "Ingestion pipeline failed");

    // Flip the doc to "failed" so the user sees an actionable status. If
    // THIS write fails we cannot fix bookkeeping — log loudly so the orphan
    // "processing" row is visible in monitoring; don't shadow the original
    // error in the returned PipelineResult.
    const { error: failedStatusErr } = await supabase
      .from("user_documents")
      .update({
        processing_status: "failed",
        error_message: message,
      })
      .eq("id", documentId);
    if (failedStatusErr) {
      logger.error(
        { err: failedStatusErr, documentId, originalErr: message },
        "Failed to mark document as failed — doc stuck in 'processing' after pipeline error"
      );
    }

    return { chunksCreated: 0, conceptLinksCreated: 0, error: message };
  }
}
