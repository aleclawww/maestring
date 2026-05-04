/**
 * /preview/auth/signup — create account.
 *
 * Same shape as login but with one extra field (name) + a "trust strip"
 * showing what they're getting (free trial, no card, cancel anytime).
 */
'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Github,
  Lock,
  Mail,
  User,
  Check,
} from 'lucide-react'
import { Button, Card, Field, Input } from '@/components/v2'

const TRUST = [
  '7-day free trial',
  'No credit card required',
  'Cancel anytime',
]

export default function SignupPage() {
  return (
    <div className="w-full max-w-[480px]">
      <Card padding="lg" className="sm:p-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="v2-display text-[28px] text-v2-foreground sm:text-[32px]">
            Create your account
          </h1>
          <p className="mt-1.5 text-[14px] text-v2-foreground-muted">
            Start your AWS prep — free for 7 days.
          </p>
        </div>

        {/* OAuth */}
        <div className="mt-8 flex flex-col gap-3">
          <Button variant="secondary" size="lg" className="w-full">
            <GoogleMark />
            Sign up with Google
          </Button>
          <Button variant="secondary" size="lg" className="w-full">
            <Github className="h-4 w-4" strokeWidth={2} />
            Sign up with GitHub
          </Button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-v2-border" />
          <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            Or with email
          </span>
          <div className="h-px flex-1 bg-v2-border" />
        </div>

        {/* Email form */}
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Full name" htmlFor="signup-name" required>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v2-foreground-subtle"
                strokeWidth={2}
              />
              <Input
                type="text"
                placeholder="Alex Smith"
                autoComplete="name"
                required
                className="pl-9"
              />
            </div>
          </Field>

          <Field label="Work email" htmlFor="signup-email" required>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v2-foreground-subtle"
                strokeWidth={2}
              />
              <Input
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="pl-9"
              />
            </div>
          </Field>

          <Field
            label="Password"
            htmlFor="signup-password"
            hint="At least 12 characters."
            required
          >
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v2-foreground-subtle"
                strokeWidth={2}
              />
              <Input
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                className="pl-9"
              />
            </div>
          </Field>

          <Button size="lg" type="submit" className="w-full">
            Create account
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Button>

          <p className="text-center text-[12px] leading-[1.6] text-v2-foreground-subtle">
            By creating an account you agree to our{' '}
            <Link
              href="/preview/landing/terms"
              className="font-semibold text-v2-foreground-muted underline underline-offset-2 hover:text-v2-foreground"
            >
              Terms
            </Link>{' '}
            and{' '}
            <Link
              href="/preview/landing/privacy"
              className="font-semibold text-v2-foreground-muted underline underline-offset-2 hover:text-v2-foreground"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </form>

        <p className="mt-6 text-center text-[13px] text-v2-foreground-muted">
          Already have an account?{' '}
          <Link
            href="/preview/auth/login"
            className="font-semibold text-v2-brand hover:text-v2-brand-hover"
          >
            Sign in
          </Link>
        </p>
      </Card>

      {/* Trust strip — quiet reassurance under the card */}
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-v2-foreground-muted">
        {TRUST.map((t) => (
          <li key={t} className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-v2-success" strokeWidth={2.5} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      width="16"
      height="16"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.1 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  )
}
