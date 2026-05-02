export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * One-shot endpoint to apply migration 048_learning_engine.sql against prod.
 * Idempotent (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION, etc.).
 * Removed after the migration is applied.
 */
export async function POST(_req: NextRequest) {
  void _req;
  const supabase = createAdminClient();

  // Run statements one at a time via the Supabase REST exec_sql RPC. We don't
  // have raw SQL access, so use the service-role key to call a PG function.
  // Fallback: if no exec_sql RPC exists, return a clear error.
  let sql: string;
  try {
    sql = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '048_learning_engine.sql'),
      'utf-8'
    );
  } catch (e) {
    return NextResponse.json({ error: 'migration_file_not_found', detail: String(e) }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('exec_sql', { sql });
  if (error) {
    logger.error({ err: error }, 'apply-migration-048: exec_sql failed (likely no exec_sql RPC in prod)');
    return NextResponse.json({
      error: 'exec_sql_unavailable',
      detail: error.message,
      hint: 'Apply this SQL manually via Supabase Dashboard → SQL Editor',
      migrationPath: 'supabase/migrations/048_learning_engine.sql',
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, migration: '048_learning_engine.sql' });
}
