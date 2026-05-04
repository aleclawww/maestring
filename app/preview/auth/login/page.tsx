/**
 * /preview/auth/login — sign-in form.
 *
 * 480px max-width centered card. OAuth first (Google + GitHub), divider,
 * then email + password. Primary CTA full-width. Switches to /signup via
 * the footer link.
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Github, Lock, Mail } from 'lucide-react'
import { Button, Card, Field, Input } from '@/components/v2'

export default function LoginPage() {
  return (
    <Card padding="lg" className="w-full max-w-[480px] sm:p-10">
      <div className="flex flex-col items-center text-center">
        <h1 className="v2-display text-[28px] text-v2-foreground sm:text-[32px]">
          Welcome back
        </h1>
        <p className="mt-1.5 text-[14px] text-v2-foreground-muted">
          Sign in to keep your streak alive.
        </p>
      </div>

      {/* OAuth */}
      <div className="mt-8 flex flex-col gap-3">
        <Button variant="secondary" size="lg" className="w-full">
          <GoogleMark />
          Continue with Google
        </Button>
        <Button variant="secondary" size="lg" className="w-full">
          <Github className="h-4 w-4" strokeWidth={2} />
          Continue with GitHub
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
        <Field label="Email" htmlFor="login-email">
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
          htmlFor="login-password"
        >
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v2-foreground-subtle"
              strokeWidth={2}
            />
            <Input
              type="password"
              autoComplete="current-password"
              required
              className="pl-9"
            />
          </div>
        </Field>

        <div className="flex items-center justify-end">
          <Link
            href="/preview/auth/forgot-password"
            className="text-[13px] font-semibold text-v2-brand hover:text-v2-brand-hover"
          >
            Forgot password?
          </Link>
        </div>

        <Button size="lg" type="submit" className="w-full">
          Sign in
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-v2-foreground-muted">
        No account yet?{' '}
        <Link
          href="/preview/auth/signup"
          className="font-semibold text-v2-brand hover:text-v2-brand-hover"
        >
          Create one — it's free
        </Link>
      </p>
    </Card>
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
