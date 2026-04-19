import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/blog',
  '/auth/callback',
]

const PUBLIC_PREFIXES = [
  '/api/webhooks/',
  '/r/',
  '/_next/',
  '/favicon',
  '/robots',
  '/sitemap',
  '/api/magic',
  '/legal/',
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect cron routes
  if (pathname.startsWith('/api/cron/')) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Refresh Supabase session
  const { response, user } = await updateSession(request)

  // Admin routes: only allow ADMIN_EMAILS
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
    if (!adminEmails.includes(user.email ?? '')) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    return response
  }

  // Public routes: always allow
  if (isPublic(pathname)) {
    return response
  }

  // Protected routes: require auth
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Onboarding gate: redirect to /onboarding if not completed.
  // Source of truth is profiles.onboarding_completed; we mirror it into
  // user_metadata at calibration time to avoid a DB roundtrip per request.
  // Skip the gate for the onboarding flow itself and its API, plus auth/logout.
  const isOnboardingPath =
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/') ||
    pathname.startsWith('/api/onboarding/') ||
    pathname.startsWith('/api/auth/')
  if (!isOnboardingPath) {
    const onboardingCompleted = user.user_metadata?.['onboarding_completed'] === true
    if (!onboardingCompleted) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
