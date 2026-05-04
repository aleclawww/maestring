import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Gift } from 'lucide-react'
import SignupForm from './SignupForm'
import type { Metadata } from 'next'
import { Logo } from '@/components/v2'

export const dynamic = 'force-dynamic'

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
            Start free
          </h1>
          <p className="mt-1.5 text-[14px] text-v2-foreground-muted">
            Prep for AWS SAA-C03 with adaptive AI
          </p>
        </div>

        {/* Referral badge */}
        {searchParams.ref && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-v2-success/30 bg-v2-success-soft px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-v2-success/20 text-v2-success">
              <Gift className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-v2-foreground">
                Friend invite
              </p>
              <p className="text-[12px] text-v2-foreground-muted">
                You both get 7 days of Pro free on subscription.
              </p>
            </div>
          </div>
        )}

        {searchParams.error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-v2-error/30 bg-v2-error-soft px-4 py-3 text-[13px] text-v2-error"
          >
            Error creating account. Please try again.
          </div>
        )}

        <div className="mt-8">
          <SignupForm referralCode={searchParams.ref} />
        </div>

        <p className="mt-6 text-center text-[13px] text-v2-foreground-muted">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-v2-brand hover:text-v2-brand-hover"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-[12px] leading-[1.6] text-v2-foreground-subtle">
          By signing up, you agree to our{' '}
          <Link
            href="/legal/terms"
            className="font-semibold text-v2-foreground-muted underline underline-offset-2 hover:text-v2-foreground"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/legal/privacy"
            className="font-semibold text-v2-foreground-muted underline underline-offset-2 hover:text-v2-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  )
}
