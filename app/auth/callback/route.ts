import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendEmail } from '@/lib/email'
import { WelcomeEmail } from '@/lib/email/templates/WelcomeEmail'
import { logger } from '@/lib/logger'
import { captureApiException } from '@/lib/sentry/capture'

const ALLOWED_NEXT_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/study',
  '/progress',
  '/exam',
  '/settings',
  '/documents',
  '/referrals',
]

function isSafeRedirectUrl(url: string): boolean {
  if (!url.startsWith('/')) return false
  return ALLOWED_NEXT_PREFIXES.some(prefix => url.startsWith(prefix)) || url === '/dashboard'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Anti open-redirect
  const safeNext = isSafeRedirectUrl(next) ? next : '/dashboard'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Fetch onboarding + welcome-email state in one round trip.
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('onboarding_completed, welcome_email_sent_at, full_name, exam_date')
        .eq('id', data.user.id)
        .single()

      if (profileErr) {
        // Without profile state we can't decide the onboarding redirect
        // or send the welcome email. Log so a "first-login email never
        // arrived" support ticket has a correlating row. Don't fail the
        // login — the user still lands somewhere valid (safeNext).
        logger.warn(
          { err: profileErr, userId: data.user.id },
          'Failed to load profile after OAuth code exchange — onboarding redirect and welcome email will be skipped'
        )
      }

      // Fire welcome email exactly once. The UPDATE uses `is('welcome_email_sent_at', null)`
      // so two concurrent callbacks won't both send — whichever wins the write sends.
      if (profile && !profile.welcome_email_sent_at && data.user.email) {
        const { data: claimed } = await supabase
          .from('profiles')
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq('id', data.user.id)
          .is('welcome_email_sent_at', null)
          .select('id')
          .maybeSingle()

        if (claimed) {
          const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? 'there'
          const studyUrl = `${origin}/onboarding`
          try {
            await sendEmail({
              to: data.user.email,
              subject: 'Welcome to Maestring 🚀',
              react: WelcomeEmail({
                firstName,
                studyUrl,
                examDate: profile.exam_date ?? undefined,
              }),
              tags: [{ name: 'type', value: 'welcome' }],
            })
          } catch (err) {
            // Roll back the claim so the next login retries. If the
            // rollback itself fails we're in a trap: the claim stays at
            // now() and the user will never receive a welcome email on
            // any subsequent login (the `is('welcome_email_sent_at', null)`
            // guard at L52 will keep rejecting the claim). Log loudly —
            // without this log the "I never got a welcome email" ticket
            // looks impossible to reproduce from the outside.
            const { error: rollbackErr } = await supabase
              .from('profiles')
              .update({ welcome_email_sent_at: null })
              .eq('id', data.user.id)
            if (rollbackErr) {
              logger.error(
                { err: rollbackErr, origErr: err, userId: data.user.id },
                'Failed to roll back welcome_email_sent_at after send failure — user is stuck and will never receive the welcome email'
              )
            }
            captureApiException(err, { route: '/auth/callback', userId: data.user.id })
            logger.error({ err, userId: data.user.id }, 'Welcome email send failed')
          }
        }
      }

      if (profile && !profile.onboarding_completed && safeNext !== '/onboarding') {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
