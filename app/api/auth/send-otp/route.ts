import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkAuthRateLimit, rateLimitHeaders } from '@/lib/redis/rate-limit'
import { getRequestIp } from '@/lib/utils/request-ip'
import { logger } from '@/lib/logger'
import { captureApiException } from '@/lib/sentry/capture'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { MagicLinkEmail } from '@/lib/email/templates/MagicLinkEmail'
import * as React from 'react'

export const runtime = 'nodejs'

// Supabase enforces its own redirect-URL allowlist on the project side, but
// server-side validation is a second layer: if the allowlist is misconfigured
// or a new preview URL is added without updating it, an attacker could supply
// an arbitrary `redirectTo` and have Supabase send a magic link that, after
// verification, redirects the user to a phishing site.  We pin to our own
// origin before the value ever reaches Supabase.
function makeRedirectToValidator() {
  const appUrl = (process.env['NEXT_PUBLIC_APP_URL'] ?? '').replace(/\/$/, '')
  return z.string().url().refine(
    (v) => appUrl !== '' && (v === appUrl || v.startsWith(appUrl + '/')),
    { message: 'redirectTo must point to the application origin' },
  )
}

const BodySchema = z.object({
  email: z.string().email().max(254),
  fullName: z.string().trim().min(1).max(120).optional(),
  referralCode: z.string().trim().max(64).optional(),
  redirectTo: makeRedirectToValidator(),
  intent: z.enum(['login', 'signup']).default('login'),
})

export async function POST(req: NextRequest) {
  // 1) IP rate limit — the main anti-abuse guard. 5 requests per 15 min per IP.
  const ip = getRequestIp(req)
  const rl = await checkAuthRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'too_many_requests', message: 'Too many attempts. Please try again in a few minutes.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    )
  }

  // 2) Parse & validate.
  let parsed
  try {
    parsed = BodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const email = parsed.email.toLowerCase().trim()

  // 3) Secondary per-email rate limit so a rotating-IP attacker can't spam one mailbox.
  const perEmail = await checkAuthRateLimit(`email:${email}`)
  if (!perEmail.allowed) {
    return NextResponse.json(
      { error: 'too_many_requests', message: 'Too many attempts for this email. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(perEmail) },
    )
  }

  const supabase = createAdminClient()

  // 4) Generate the magic link via the admin API (no email is dispatched by
  //    Supabase — we send our own branded email below). This avoids the
  //    default unbranded Supabase email while keeping the same auth flow:
  //    the returned action_link goes through Supabase's own /auth/v1/verify
  //    which sets the session cookie before redirecting to `redirectTo`.
  let actionLink: string
  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: parsed.redirectTo,
        data:
          parsed.intent === 'signup'
            ? { full_name: parsed.fullName, referred_by_code: parsed.referralCode }
            : undefined,
      },
    })

    if (error || !data?.properties?.action_link) {
      logger.warn(
        { err: error?.message, intent: parsed.intent },
        'generateLink failed — cannot send magic link email',
      )
      return NextResponse.json(
        { error: 'send_failed', message: 'Failed to send the email. Please try again.' },
        { status: 502 },
      )
    }

    actionLink = data.properties.action_link
  } catch (err) {
    captureApiException(err, { route: '/api/auth/send-otp' })
    logger.error({ err }, 'send-otp unexpected error in generateLink')
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }

  // 5) Resolve a first name for personalisation. For signup, use the name
  //    they just supplied. For login, we'd need to join auth.users → profiles
  //    which requires a second round-trip and auth.users isn't exposed via
  //    PostgREST. Keep it simple: "there" reads naturally in "Hi there 👋"
  //    and the auth flow is the critical path — don't risk it for cosmetics.
  let firstName = 'there'
  if (parsed.intent === 'signup' && parsed.fullName) {
    firstName = parsed.fullName.split(' ')[0] ?? 'there'
  }

  // 6) Send branded email.
  try {
    await sendEmail({
      to: email,
      subject: parsed.intent === 'signup'
        ? 'Confirm your Maestring account'
        : 'Your Maestring sign-in link',
      react: React.createElement(MagicLinkEmail, {
        firstName,
        magicLinkUrl: actionLink,
        intent: parsed.intent,
        email,
      }),
      tags: [{ name: 'intent', value: parsed.intent }],
    })
  } catch (err) {
    // Email send failed — log but don't leak details to the client.
    // The magic link token was already created in Supabase; we just couldn't
    // deliver the email this time. Returning 502 here is correct: the user
    // can retry, which will generate a new token and attempt delivery again.
    captureApiException(err, { route: '/api/auth/send-otp' })
    logger.error({ err, intent: parsed.intent }, 'send-otp: branded email delivery failed')
    return NextResponse.json(
      { error: 'send_failed', message: 'Failed to send the email. Please try again.' },
      { status: 502 },
    )
  }

  // Always return 200 (no account enumeration).
  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rl) })
}
