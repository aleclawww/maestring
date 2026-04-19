import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_NEXT_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/study',
  '/progress',
  '/exam',
  '/settings',
  '/documents',
  '/referrals',
]

function isSafeRedirectUrl(url: string): boolean {
  if (!url.startsWith('/')) return false
  return ALLOWED_NEXT_PREFIXES.some(prefix => url.startsWith(prefix)) || url === '/dashboard'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Anti open-redirect
  const safeNext = isSafeRedirectUrl(next) ? next : '/dashboard'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single()

      if (profile && !profile.onboarding_completed && safeNext !== '/onboarding') {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
