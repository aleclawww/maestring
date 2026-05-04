import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LoginForm from './LoginForm'
import type { Metadata } from 'next'
import { Logo } from '@/components/v2'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Maestring to continue your AWS prep.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; message?: string; msg?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(searchParams.next ?? '/dashboard')
  }

  const errorMessages: Record<string, string> = {
    invalid_credentials: 'Incorrect email or password.',
    email_not_confirmed: 'Please confirm your email before signing in.',
    too_many_requests: 'Too many attempts. Try again in a few minutes.',
    user_not_found: 'No account exists for that email.',
    oauth_expired: 'The sign-in link expired. Please try again.',
    oauth_invalid_grant:
      'This sign-in link was already used (e.g. by clicking back). Click "Continue with Google" again to start fresh.',
    oauth_exchange_failed:
      "Couldn't complete sign-in. If you're on Safari or have third-party cookies blocked, try another browser or enable cookies and retry.",
    oauth_exchange_threw:
      "Couldn't reach the auth server. Check your connection and try again.",
    oauth_pkce_missing:
      'Your browser dropped the auth session (third-party cookies blocked or you opened the sign-in on a different device/tab). Please start again in a regular window.',
    oauth_missing_code:
      "Sign-in didn't complete. Please start again from this page.",
    oauth_provider_error: 'Google rejected the sign-in. See details below.',
    auth_callback_failed: 'Sign-in error. Please try again.',
  }

  const errorMessage = searchParams.error
    ? errorMessages[searchParams.error] ?? 'Sign-in error. Please try again.'
    : null
  const errorDetail = searchParams.msg ? searchParams.msg.slice(0, 300) : null

  return (
    <div className="theme-v2 relative isolate min-h-screen overflow-hidden bg-v2-surface-subtle">
      {/* Atmospheric brand orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--v2-gradient-brand)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 bottom-0 h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
        style={{ background: 'var(--v2-gradient-brand-soft)' }}
      />

      <header className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6">
        <Logo size={22} href="/" />
        <Link
          href="/"
          className="text-[13px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
        >
          ← Back to site
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-col items-stretch px-6 pb-16 pt-8 sm:pt-16">
        <div className="text-center">
          <h1 className="v2-display text-[28px] text-v2-foreground sm:text-[32px]">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[14px] text-v2-foreground-muted">
            Continue your AWS prep
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-v2-error/30 bg-v2-error-soft px-4 py-3 text-[13px] text-v2-error"
          >
            <p className="font-semibold">{errorMessage}</p>
            {errorDetail && (
              <p className="mt-1 break-words font-v2-mono text-[11px] opacity-80">
                {errorDetail}
              </p>
            )}
          </div>
        )}

        {/* Success message */}
        {searchParams.message && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-v2-success/30 bg-v2-success-soft px-4 py-3 text-[13px] text-v2-success"
          >
            {searchParams.message}
          </div>
        )}

        <div className="mt-8">
          <LoginForm nextUrl={searchParams.next} />
        </div>

        <p className="mt-6 text-center text-[13px] text-v2-foreground-muted">
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-v2-brand hover:text-v2-brand-hover"
          >
            Sign up free
          </Link>
        </p>
      </main>
    </div>
  )
}
