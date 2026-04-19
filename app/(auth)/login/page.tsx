import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: 'Accede a Maestring para continuar tu preparación para AWS.',
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
    'invalid_credentials': 'Email o contraseña incorrectos.',
    'email_not_confirmed': 'Confirma tu email antes de iniciar sesión.',
    'too_many_requests': 'Demasiados intentos. Espera unos minutos.',
    'user_not_found': 'No existe una cuenta con ese email.',
  }

  const errorMessage = searchParams.error
    ? (errorMessages[searchParams.error] ?? 'Error al iniciar sesión. Inténtalo de nuevo.')
    : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Continúa tu preparación para AWS
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
          ¿No tienes cuenta?{' '}
          <a href="/signup" className="text-primary hover:underline">
            Regístrate gratis
          </a>
        </p>
      </div>
    </div>
  )
}
