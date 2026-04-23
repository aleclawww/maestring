import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const { data: doc, error: docErr } = await supabase
    .from("user_documents")
    .select("id, processing_status, chunk_count, error_message, updated_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (docErr) {
    // Silent 404 here made "document missing" indistinguishable from an
    // RLS regression: the user's upload panel just froze showing "Not
    // found" with no log trace. Log error + 500 so the panel can retry
    // and the operator sees the real cause.
    logger.error(
      { err: docErr, docId: params.id, userId: user.id },
      "Failed to load user_documents row for status poll"
    );
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Server-Sent Events for real-time status
  if (req.headers.get("accept") === "text/event-stream") {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}

`));
        };

        send(doc);

        if (doc.processing_status === "completed" || doc.processing_status === "failed") {
          controller.close();
          return;
        }

        // Poll for updates every 2 seconds up to 120 seconds
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          // Silent-swallow: the old bare `{ data: updated }` destructure
          // meant a failing poll (RLS regression, transient DB error)
          // just skipped the `send(updated)` call — the client SSE
          // stream stayed open but stopped receiving updates. No log
          // trace, so "upload stuck at processing" bug reports had
          // nothing to correlate. Log warn per attempt; keep polling
          // because the next tick may succeed and we don't want a
          // single blip to kill the whole stream.
          const { data: updated, error: pollErr } = await createAdminClient()
            .from("user_documents")
            .select("id, processing_status, chunk_count, error_message, updated_at")
            .eq("id", params.id)
            .single();

          if (pollErr) {
            logger.warn(
              { err: pollErr, docId: params.id, attempt: attempts },
              "SSE status poll failed — SSE stream remains open, client won't see progress this tick"
            );
          }

          if (updated) send(updated);

          if (
            attempts >= 60 ||
            updated?.processing_status === "completed" ||
            updated?.processing_status === "failed"
          ) {
            clearInterval(interval);
            controller.close();
          }
        }, 2000);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  return NextResponse.json({ document: doc });
}
