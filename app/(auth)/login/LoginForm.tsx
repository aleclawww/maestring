'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, Mail, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, Field, Input, Card } from '@/components/v2'

interface LoginFormProps {
  nextUrl?: string
}

export default function LoginForm({ nextUrl }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    // Wrapped in try/catch — a network error must NOT leave loading=true.
    // On the login path that hangs the spinner forever and the user has
    // to hard-refresh.
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/auth/callback?next=${
            nextUrl ?? '/dashboard'
          }`,
          intent: 'login',
        }),
      })

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string
          message?: string
        }
        console.error('LoginForm send-otp failed', { status: res.status, body: j })
        setError(
          j.message ??
            j.error ??
            `Could not send the link (HTTP ${res.status}).`,
        )
        return
      }
      setSent(true)
    } catch (err) {
      console.error('LoginForm send-otp network error', err)
      setError(
        'Network error while sending the link. Check your connection and try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleOAuth() {
    // Guard against double-clicks: a duplicate signInWithOAuth call overwrites
    // the PKCE code_verifier cookie and breaks the callback.
    if (googleLoading) return
    setGoogleLoading(true)
    setError(null)

    // Clear any half-baked session before starting a new flow.
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      /* best effort */
    }

    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${
            nextUrl ?? '/dashboard'
          }`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (err) {
        console.error('LoginForm signInWithOAuth failed', err)
        setError(err.message || 'Could not start Google sign-in. Try again.')
        setGoogleLoading(false)
      }
    } catch (err) {
      console.error('LoginForm signInWithOAuth threw', err)
      setError(
        'Network error while starting Google sign-in. Check your connection.',
      )
      setGoogleLoading(false)
    }
  }

  if (sent) {
    return (
      <Card padding="lg" className="text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-success-soft text-v2-success">
          <Mail className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="v2-display mt-5 text-[22px] text-v2-foreground">
          Check your email
        </h2>
        <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
          We sent a magic link to{' '}
          <span className="font-semibold text-v2-foreground">{email}</span>.
          Click it to sign in.
        </p>
        <p className="mt-3 text-[12px] text-v2-foreground-subtle">
          The link expires in 1 hour. Check your spam folder too.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-5 text-[13px] font-semibold text-v2-brand hover:text-v2-brand-hover"
        >
          Use a different email
        </button>
      </Card>
    )
  }

  return (
    <Card padding="lg" className="sm:p-8">
      {/* Google OAuth */}
      <Button
        variant="secondary"
        size="lg"
        onClick={handleGoogleOAuth}
        disabled={googleLoading}
        loading={googleLoading}
        className="w-full"
        type="button"
      >
        {!googleLoading && <GoogleMark />}
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-v2-border" />
        <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Or with email
        </span>
        <div className="h-px flex-1 bg-v2-border" />
      </div>

      {/* Magic link form */}
      <form onSubmit={handleMagicLink} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-v2-error/30 bg-v2-error-soft px-3 py-2 text-[13px] text-v2-error"
          >
            {error}
          </div>
        )}
        <Field label="Email" htmlFor="login-email" required>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v2-foreground-subtle"
              strokeWidth={2}
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              autoFocus
              className="pl-9"
            />
          </div>
        </Field>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || !email.trim()}
          loading={loading}
        >
          {!loading && <Sparkles className="h-4 w-4" strokeWidth={2.25} />}
          {loading ? 'Sending…' : 'Send magic link'}
          {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
        </Button>
      </form>

      <p className="mt-5 text-center text-[12px] text-v2-foreground-subtle">
        No password. We email you a link.
      </p>
    </Card>
  )
}

function GoogleMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className="h-4 w-4"
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
