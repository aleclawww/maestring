export const runtime = 'nodejs'

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
  // Google/Supabase redirect back with these when the provider itself rejects
  // (e.g. user denied consent, redirect URI mismatch, OAuth app disabled).
  // Without explicit handling we used to slide into the "no code" branch with
  // a misleading oauth_missing_code — masking the real reason.
  const providerError = searchParams.get('error')
  const providerErrorDescription = searchParams.get('error_description')

  // Anti open-redirect
  const safeNext = isSafeRedirectUrl(next) ? next : '/dashboard'

  if (providerError) {
    logger.error(
      { providerError, providerErrorDescription, url: request.url },
      'OAuth provider returned error'
    )
    captureApiException(
      new Error(`OAuth provider error: ${providerError} — ${providerErrorDescription ?? 'no description'}`),
      { route: '/auth/callback' }
    )
    const msg = providerErrorDescription ?? providerError
    return NextResponse.redirect(
      `${origin}/login?error=oauth_provider_error&msg=${encodeURIComponent(msg)}`
    )
  }

  if (code) {
    const supabase = createClient()

    // Previously: no try/catch. exchangeCodeForSession can REJECT (not just
    // return `{error}`) on network failure or when Supabase returns a non-JSON
    // body — classic silent-swallow that produced a useless generic error.
    let exchangeResult: Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>
    try {
      exchangeResult = await supabase.auth.exchangeCodeForSession(code)
    } catch (err) {
      logger.error({ err }, 'exchangeCodeForSession threw — likely Supabase network error or non-JSON body')
      captureApiException(err, { route: '/auth/callback' })
      return NextResponse.redirect(`${origin}/login?error=oauth_exchange_threw`)
    }
    const { data, error } = exchangeResult

    if (error || !data.user) {
      // Previously: any exchange failure silently fell through to the
      // generic `?error=auth_callback_failed` redirect at the bottom with
      // no log line — impossible to diagnose from ops. Most common causes:
      //   1. PKCE code_verifier cookie missing (Safari ITP, third-party
      //      cookie blocking, user started OAuth on a different domain).
      //   2. Code already redeemed (user double-clicked the callback link,
      //      Supabase returns "invalid grant").
      //   3. Clock skew / expired code (>10 min between redirect and land).
      // Surface the real reason so support tickets have a correlating row.
      logger.error(
        { err: error, hasUser: !!data?.user },
        'OAuth code exchange failed'
      )
      captureApiException(error ?? new Error('exchangeCodeForSession returned no user'), {
        route: '/auth/callback',
      })
      const errMsg = (error?.message ?? '').toLowerCase()
      const reason = errMsg.includes('expired')
        ? 'oauth_expired'
        : errMsg.includes('invalid') || errMsg.includes('not found') || errMsg.includes('already')
          ? 'oauth_invalid_grant'
          : errMsg.includes('verifier') || errMsg.includes('pkce')
            ? 'oauth_pkce_missing'
            : 'oauth_exchange_failed'
      // Attach the raw Supabase message so the login page can show it inline.
      // Without this the admin can't diagnose without pulling Vercel logs.
      const msg = error?.message ? `&msg=${encodeURIComponent(error.message)}` : ''
      return NextResponse.redirect(`${origin}/login?error=${reason}${msg}`)
    }

    {
      // Fetch onboarding + welcome-email state in one round trip.
      let { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('onboarding_completed, welcome_email_sent_at, full_name, exam_target_date')
        .eq('id', data.user.id)
        .single()

      // Self-heal: migration 033 hardened handle_new_user() so a failing
      // sub-INSERT no longer rolls back auth.users. The flip side is that
      // a user can land here with no profile row (or missing org/sub). If
      // we don't find a profile, call the idempotent bootstrap RPC and
      // re-fetch. Without this the user would ping-pong between
      // dashboard/onboarding on every login because downstream queries
      // assume the profile exists.
      if (!profile || profileErr) {
        const { error: healErr } = await supabase.rpc('ensure_user_bootstrapped', {
          p_user_id: data.user.id,
        })
        if (healErr) {
          logger.error(
            { err: healErr, userId: data.user.id },
            'ensure_user_bootstrapped RPC failed after missing profile on OAuth callback'
          )
          captureApiException(healErr, { route: '/auth/callback', userId: data.user.id })
        } else {
          const retry = await supabase
            .from('profiles')
            .select('onboarding_completed, welcome_email_sent_at, full_name, exam_target_date')
            .eq('id', data.user.id)
            .single()
          profile = retry.data
          profileErr = retry.error
        }
      }

      if (profileErr) {
        // Without profile state we can't decide the onboarding redirect
        // or send the welcome email. Log so a "first-login email never
        // arrived" support ticket has a correlating row. Don't fail the
        // login — the user still lands somewhere valid (safeNext).
        logger.warn(
          { err: profileErr, userId: data.user.id },
          'Failed to load profile after OAuth code exchange + self-heal — onboarding redirect and welcome email will be skipped'
        )
      }

      // Fire welcome email exactly once. The UPDATE uses `is('welcome_email_sent_at', null)`
      // so two concurrent callbacks won't both send — whichever wins the write sends.
      if (profile && !profile.welcome_email_sent_at && data.user.email) {
        // Silent failure on the claim read collapsed to `claimed = null` →
        // the `if (claimed)` branch at L67 is skipped and the welcome email
        // is not sent. On the NEXT login, the read of welcome_email_sent_at
        // still shows the timestamp we wrote above, so the outer guard also
        // skips — the user is now permanently stuck without a welcome
        // email. Log error so "I never got a welcome email" tickets have a
        // correlating row and ops can force-resend.
        const { data: claimed, error: claimErr } = await supabase
          .from('profiles')
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq('id', data.user.id)
          .is('welcome_email_sent_at', null)
          .select('id')
          .maybeSingle()
        if (claimErr) {
          logger.error(
            { err: claimErr, userId: data.user.id },
            'Welcome email claim read failed — write may have succeeded; user may be stuck without welcome email'
          )
        }

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
                examDate: profile.exam_target_date ?? undefined,
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

  // Landed on /auth/callback with no ?code and no ?error — usually a user
  // opening the callback URL directly, or the OAuth provider redirect stripped
  // params. Log so we can spot provider-side regressions.
  logger.warn({ url: request.url }, 'OAuth callback hit without code or error param')
  return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`)
}
