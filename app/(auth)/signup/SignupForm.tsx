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

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        data: {
          full_name: name.trim(),
          referred_by_code: referralCode,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      track({ name: 'signup_completed', properties: { method: 'magic' } })
      setSent(true)
      setLoading(false)
    }
  }

  async function handleGoogleOAuth() {
    track({ name: 'signup_completed', properties: { method: 'google' } })
    setGoogleLoading(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-6 text-center">
        <div className="mb-3 text-4xl">🎉</div>
        <h2 className="mb-2 font-semibold text-text-primary">¡Casi listo!</h2>
        <p className="text-sm text-text-secondary">
          Te enviamos un enlace de confirmación a{' '}
          <span className="font-medium text-text-primary">{email}</span>.
          Haz clic en él para activar tu cuenta.
        </p>
        <p className="mt-3 text-xs text-text-muted">
          El enlace expira en 1 hora.
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
        Registrarse con Google
      </button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-2 text-text-muted">o con email</span>
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
            Nombre completo
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Juan García"
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
            placeholder="tu@email.com"
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
              Creando cuenta...
            </>
          ) : (
            'Crear cuenta gratis'
          )}
        </button>
      </form>
    </div>
  )
}
