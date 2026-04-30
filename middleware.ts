import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { verifyCronSecret } from '@/lib/auth/verify-cron-secret'

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
  // Public liveness/uptime probe — external monitors hit this unauthenticated.
  // The handler pings Supabase + Redis and returns 200/503.
  '/api/health',
  '/r/',
  '/_next/',
  '/favicon',
  '/robots',
  '/sitemap',
  '/api/magic',
  '/legal/',
  // Blog posts are public marketing content — /blog is in PUBLIC_ROUTES but
  // only matches the index exactly. Without this prefix, /blog/[slug] SSG pages
  // redirect unauthenticated visitors to /login.
  '/blog/',
  // OG image generation — called by link-unfurl crawlers (Slack, Twitter, etc.)
  // which are never authenticated.
  '/api/og/',
  // Test-auth shim is public only when explicitly enabled — the route handler
  // returns 404 otherwise, so this prefix is inert in production.
  ...(process.env['ALLOW_TEST_AUTH'] === '1' ? ['/api/test/'] : []),
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Expose the real pathname to server components / layouts. We delete any
  // client-supplied x-pathname first so a crafted request header cannot spoof
  // routing decisions made by layouts that read this value.
  request.headers.delete('x-pathname')
  request.headers.set('x-pathname', pathname)

  // Protect cron routes — use constant-time comparison to prevent timing attacks.
  if (pathname.startsWith('/api/cron/')) {
    if (!verifyCronSecret(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Internal server-to-server calls (document processing trigger, admin-
  // initiated retries, etc.) use the same CRON_SECRET bearer that Vercel
  // Cron uses.  Without this bypass, the internal fetch() that upload/
  // retry routes make to /api/documents/[id]/process has no session
  // cookie, so middleware 307-redirects it to /login.  fetch() follows the
  // redirect by default, gets back 200 HTML from the login page, and since
  // res.ok is true the caller never detects the failure — the document is
  // silently left in processing_status='pending' forever.
  //
  // Route handlers that accept CRON_SECRET perform their own auth check
  // (e.g. documents/[id]/process checks the bearer before doing anything),
  // so passing through here is defense-in-depth, not a bypass.
  if (pathname.startsWith('/api/') && verifyCronSecret(request.headers.get('authorization'))) {
    return NextResponse.next()
  }

  // CSRF: reject state-changing requests from unexpected origins.
  // Supabase sets SameSite=Lax cookies which already blocks most CSRF, but
  // adding an Origin check is belt-and-suspenders for sensitive mutations.
  // Rules:
  //   - Only check mutating methods (POST/PATCH/PUT/DELETE).
  //   - Skip public routes (webhooks validated by payload sig, magic links, etc.).
  //   - If no Origin header: allow (server-to-server, curl — rely on auth gate below).
  //   - If Origin present and doesn't match this app's host: block with 403.
  const isMutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)
  if (
    isMutating &&
    pathname.startsWith('/api/') &&
    // Cron routes are server-to-server (Vercel infra or manual scripts) — they
    // never send an Origin header and are already protected by CRON_SECRET.
    // Exclude them from the CSRF origin check so the cron gate fires first.
    !pathname.startsWith('/api/cron/') &&
    !PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  ) {
    const origin = request.headers.get('origin')
    if (origin) {
      try {
        const originHost = new URL(origin).host
        const appHost = request.nextUrl.host // e.g. maestring.com or localhost:3000
        if (originHost !== appHost) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } catch {
        // Malformed Origin header → block
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
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
      // API routes: return JSON 403 so fetch() callers fail cleanly instead
      // of following a 307 that turns into a silent POST-to-HTML bug.
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Onboarding required', redirect: '/onboarding' },
          { status: 403 },
        )
      }
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  // Skip middleware for Next.js internals and static public assets.
  // .webmanifest is included so /site.webmanifest (Google/Chrome PWA probe)
  // isn't treated as a protected route and 307'd to /login.
  matcher: [
    '/((?!_next/static|_next/image|.*\.(?:ico|svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)',
  ],
}
