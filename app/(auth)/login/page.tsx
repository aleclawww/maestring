import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Maestring to continue your AWS prep.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; message?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(searchParams.next ?? '/dashboard')
  }

  const errorMessages: Record<string, string> = {
    'invalid_credentials': 'Incorrect email or password.',
    'email_not_confirmed': 'Please confirm your email before signing in.',
    'too_many_requests': 'Too many attempts. Try again in a few minutes.',
    'user_not_found': 'No account exists for that email.',
    'oauth_expired': 'The sign-in link expired. Please try again.',
    'oauth_invalid_grant': 'This sign-in link was already used. Please try again.',
    'oauth_exchange_failed': "Couldn't complete sign-in. If you're on Safari or have third-party cookies blocked, try another browser or enable cookies and retry.",
    'oauth_missing_code': "Sign-in didn't complete. Please start again from this page.",
    'auth_callback_failed': 'Sign-in error. Please try again.',
  }

  const errorMessage = searchParams.error
    ? (errorMessages[searchParams.error] ?? 'Sign-in error. Please try again.')
    : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Continue your AWS prep
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </div>
        )}

        {/* Success message */}
        {searchParams.message && (
          <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            {searchParams.message}
          </div>
        )}

        <LoginForm nextUrl={searchParams.next} />

        <p className="mt-6 text-center text-sm text-text-muted">
          Don't have an account?{' '}
          <a href="/signup" className="text-primary hover:underline">
            Sign up free
          </a>
        </p>
      </div>
    </div>
  )
}
