import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required but not set')
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not set')
  return createBrowserClient<Database>(url, key)
}
