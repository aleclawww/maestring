'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'

interface SignupFormProps {
  referralCode?: string
}

export default function SignupForm({ referralCode }: SignupFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !name.trim()) return
    setLoading(true)
    setError(null)
    track({ name: 'signup_started', properties: { method: 'magic' } })

    // Previously: no try/catch. A rejected fetch promise (offline, DNS blip,
    // Vercel 502 during deploy) bubbled out, leaving loading=true forever —
    // "Creating account..." spinner stuck, button disabled, user unable to
    // retry without a hard refresh. Same bug as LoginForm; on signup it's
    // worse because we also never fired the `signup_completed` event, so
    // funnel analytics underreported real attempts on flaky network days.
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: name.trim(),
          referralCode,
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          intent: 'signup',
        }),
      })

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        console.error('SignupForm send-otp failed', { status: res.status, body: j })
        setError(j.message ?? j.error ?? `Could not create the account (HTTP ${res.status}).`)
        return
      }
      track({ name: 'signup_completed', properties: { method: 'magic' } })
      setSent(true)
    } catch (err) {
      console.error('SignupForm send-otp network error', err)
      setError('Network error while creating the account. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleOAuth() {
    // Double-click guard — see LoginForm for the full rationale. A second
    // click overwrites the PKCE code_verifier and the callback exchange then
    // fails with "invalid_grant", which the user sees as a generic sign-in
    // error. On signup this is especially bad because the account IS created
    // on Supabase's side, so the user is half-registered with no way in.
    if (googleLoading) return
    setGoogleLoading(true)
    setError(null)
    track({ name: 'signup_started', properties: { method: 'google' } })
    track({ name: 'signup_completed', properties: { method: 'google' } })

    // Clear any stale local session before starting a new flow — see LoginForm.
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Best effort.
    }

    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (err) {
        console.error('SignupForm signInWithOAuth failed', err)
        setError(err.message || 'Could not start Google sign-up. Try again.')
        setGoogleLoading(false)
      }
      // On success the browser navigates to Google — loading stays true.
    } catch (err) {
      console.error('SignupForm signInWithOAuth threw', err)
      setError('Network error while starting Google sign-up. Check your connection.')
      setGoogleLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-6 text-center">
        <div className="mb-3 text-4xl">🎉</div>
        <h2 className="mb-2 font-semibold text-text-primary">Almost there!</h2>
        <p className="text-sm text-text-secondary">
          We sent a confirmation link to{' '}
          <span className="font-medium text-text-primary">{email}</span>.
          Click it to activate your account.
        </p>
        <p className="mt-3 text-xs text-text-muted">
          The link expires in 1 hour.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      {/* Google OAuth */}
      <button
        onClick={handleGoogleOAuth}
        disabled={googleLoading}
        className="btn-outline w-full mb-4"
      >
        {googleLoading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        Sign up with Google
      </button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-2 text-text-muted">or with email</span>
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-text-secondary">
            Full name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Doe"
            className="input-field"
            required
            autoComplete="name"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="input-field"
            required
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email.trim() || !name.trim()}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating account...
            </>
          ) : (
            'Create free account'
          )}
        </button>
      </form>
    </div>
  )
}
