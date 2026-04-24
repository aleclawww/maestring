import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminAction } from '@/lib/admin/rpc'
import { logger } from '@/lib/logger'

const Body = z.object({ documentId: z.string().uuid() })

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { documentId } = parsed.data

  const supabase = createAdminClient()
  // Previously `if (fetchErr || !doc) return 404 "Document not found"` collapsed
  // three conditions into one misleading response:
  //   (a) DB read error (RLS drift, PG blip),
  //   (b) genuinely-missing document,
  //   (c) (n/a here — admin can see all rows).
  // An admin clicking "Retry" during a DB hiccup saw "Document not found" and
  // reasonably concluded the record was gone, possibly triggering panic /
  // re-upload workflows. Surface (a) as a truthful 500 + logger.error so the
  // admin and ops can distinguish "transient DB failure, try again" from
  // "this document does not exist".
  const { data: doc, error: fetchErr } = await supabase
    .from('user_documents')
    .select('id, user_id, processing_status')
    .eq('id', documentId)
    .maybeSingle()
  if (fetchErr) {
    logger.error(
      { err: fetchErr, documentId, adminEmail: admin.email },
      'retry-document fetch failed — returning 500 (was previously collapsed to a misleading 404 "Document not found")'
    )
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 })
  }
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { error: updErr } = await supabase
    .from('user_documents')
    .update({ processing_status: 'pending', error_message: null })
    .eq('id', documentId)
  if (updErr) {
    logger.error({ err: updErr, documentId }, 'retry-document reset failed')
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  await recordAdminAction({
    adminEmail: admin.email!,
    action: 'retry_document',
    targetUserId: doc.user_id,
    details: { documentId, previous_status: doc.processing_status },
  })

  const cronSecret = process.env['CRON_SECRET']
  const base = process.env['NEXT_PUBLIC_APP_URL'] ?? ''
  if (cronSecret && base) {
    void fetch(`${base}/api/documents/${documentId}/process`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cronSecret}` },
    }).catch(err => logger.error({ err, documentId }, 'retry-document kickoff failed'))
  }

  return NextResponse.json({ ok: true })
}
