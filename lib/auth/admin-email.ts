// Leaf module: zero imports beyond `process.env`, safe to import from both
// server and client modules. Kept separate from `lib/auth/admin.ts` (which
// pulls in `next/navigation` + the server Supabase client) so that
// `lib/subscription/check.ts` — pulled transitively by client components
// like PreviewBanner — doesn't drag server-only imports into the client bundle.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const adminEmails = (process.env['ADMIN_EMAILS'] ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  return adminEmails.includes(email)
}
