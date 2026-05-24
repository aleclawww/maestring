import { notFound } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
export { isAdminEmail } from './admin-email'

// Middleware already 404s non-admin hits on /admin/*, but server components
// and API routes must re-check because middleware can be bypassed in edge
// cases (e.g., preview envs without middleware compiled). Defense in depth.
export async function requireAdmin() {
  const user = await requireAuthenticatedUser()
  const adminEmails = (process.env['ADMIN_EMAILS'] ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  if (!user.email || !adminEmails.includes(user.email)) {
    notFound()
  }
  return user
}

