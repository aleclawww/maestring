import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkAuthRateLimit, rateLimitHeaders } from '@/lib/redis/rate-limit'
import { getRequestIp } from '@/lib/utils/request-ip'
import { logger } from '@/lib/logger'
import { captureApiException } from '@/lib/sentry/capture'

export const runtime = 'nodejs'

const BodySchema = z.object({
  email: z.string().email().max(254),
  fullName: z.string().trim().min(1).max(120).optional(),
  referralCode: z.string().trim().max(64).optional(),
  redirectTo: z.string().url(),
  intent: z.enum(['login', 'signup']).default('login'),
})

export async function POST(req: NextRequest) {
  // 1) IP rate limit — the main anti-abuse guard. 5 requests per 15 min per IP.
  const ip = getRequestIp(req)
  const rl = await checkAuthRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'too_many_requests', message: 'Demasiados intentos. Prueba en unos minutos.' },
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
      { error: 'too_many_requests', message: 'Demasiados intentos para este email.' },
      { status: 429, headers: rateLimitHeaders(perEmail) },
    )
  }

  // 4) Send the OTP via anon-key client — Supabase handles dedup/throttle on its side too.
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: parsed.redirectTo,
        data:
          parsed.intent === 'signup'
            ? { full_name: parsed.fullName, referred_by_code: parsed.referralCode }
            : undefined,
      },
    })

    if (error) {
      logger.warn({ err: error.message, intent: parsed.intent }, 'signInWithOtp failed')
      return NextResponse.json(
        { error: 'send_failed', message: 'No se pudo enviar el email. Inténtalo de nuevo.' },
        { status: 502 },
      )
    }
  } catch (err) {
    captureApiException(err, { route: '/api/auth/send-otp' })
    logger.error({ err }, 'send-otp unexpected error')
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }

  // Always return 200 (no account enumeration).
  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rl) })
}
