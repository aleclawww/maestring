import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("user_documents")
    .select("id, processing_status, chunk_count, error_message, updated_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

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
          const { data: updated } = await createAdminClient()
            .from("user_documents")
            .select("id, processing_status, chunk_count, error_message, updated_at")
            .eq("id", params.id)
            .single();

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
