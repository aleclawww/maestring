export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { logger } from "@/lib/logger";

const SPANISH_PATTERN =
  '\\m(de la|de los|para|cuando|hasta|también|según|aunque|sólo|debe|puede|réplica|síncron|asíncron|cifrad|gratuito|automátic|alta disponibilidad|recuperación|almacenamiento|rendimiento|gobierno|cómputo|óptim|ningun)\\M';

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('exec_sql', { sql: '' });
  // Fallback: do it via two-step (select ids, then update). exec_sql may not exist.
  void data; void error;

  // Step 1: select ids of active questions whose text or options contain Spanish.
  const { data: candidates, error: selErr } = await supabase
    .from('questions')
    .select('id, question_text, options')
    .eq('is_active', true)
    .limit(20000);
  if (selErr) {
    logger.error({ err: selErr }, 'cleanup-spanish: select failed');
    return NextResponse.json({ error: 'select_failed', detail: selErr.message }, { status: 500 });
  }

  const re = new RegExp(
    SPANISH_PATTERN.replace(/\\m/g, '\\b').replace(/\\M/g, '\\b'),
    'i'
  );
  const ids = (candidates ?? [])
    .filter(q => {
      if (re.test(q.question_text ?? '')) return true;
      const opts = q.options as unknown;
      if (Array.isArray(opts)) {
        return opts.some(o => typeof o === 'string' && re.test(o));
      }
      return false;
    })
    .map(q => q.id);

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, scanned: candidates?.length ?? 0, deactivated: 0 });
  }

  // Chunked update
  const CHUNK = 500;
  let updated = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updErr } = await (supabase.from('questions') as any)
      .update({ is_active: false })
      .in('id', slice);
    if (updErr) {
      logger.error({ err: updErr, chunkStart: i }, 'cleanup-spanish: update chunk failed');
      return NextResponse.json(
        { error: 'update_failed', detail: updErr.message, updatedSoFar: updated },
        { status: 500 }
      );
    }
    updated += slice.length;
  }

  logger.info({ scanned: candidates?.length ?? 0, deactivated: updated }, 'cleanup-spanish complete');
  return NextResponse.json({ ok: true, scanned: candidates?.length ?? 0, deactivated: updated });
}
