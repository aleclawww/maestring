import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignupForm from './SignupForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Join Maestring and start your AWS prep today.',
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { ref?: string; error?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Start free</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Prep for AWS SAA-C03 with adaptive AI
          </p>
        </div>

        {/* Referral badge */}
        {searchParams.ref && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
            <span className="text-success">🎁</span>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Friend invite
              </p>
              <p className="text-xs text-text-secondary">
                You both get 7 days of Pro free on subscription.
              </p>
            </div>
          </div>
        )}

        {searchParams.error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Error creating account. Please try again.
          </div>
        )}

        <SignupForm referralCode={searchParams.ref} />

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>

        <p className="mt-4 text-center text-xs text-text-muted">
          By signing up, you agree to our{' '}
          <a href="/terms" className="hover:underline">Terms of Service</a>{' '}
          and{' '}
          <a href="/privacy" className="hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
