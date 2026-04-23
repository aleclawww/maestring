import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// Test-only auth shim. Mints a real Supabase session for a fixture user so
// Playwright can drive authenticated flows without going through magic-link
// email. Gated by ALLOW_TEST_AUTH=1 AND NODE_ENV !== 'production' — if either
// check fails, the route returns 404 as if it didn't exist.
//
// The fixture user is created on first call (idempotent). Profile is seeded
// with onboarding_completed=true so the middleware gate doesn't bounce us.
//
// DO NOT set ALLOW_TEST_AUTH in production. A deploy guard in the route plus
// a vercel.json env allowlist is the belt-and-suspenders.

const TEST_PASSWORD = 'playwright-fixture-password-v1'

const BodySchema = z.object({
  email: z.string().email().default('e2e-fixture@maestring.test'),
})

function isEnabled(): boolean {
  return (
    process.env['ALLOW_TEST_AUTH'] === '1' &&
    process.env['NODE_ENV'] !== 'production'
  )
}

export async function POST(req: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { email } = parsed.data

  const admin = createAdminClient()

  // Idempotent user create. If it already exists, createUser returns an error
  // we can safely ignore — we only need the user to exist.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { onboarding_completed: true, full_name: 'E2E Fixture' },
  })

  let userId = created?.user?.id
  if (createErr && !userId) {
    // Already exists — look it up.
    const { data: list } = await admin.auth.admin.listUsers()
    userId = list?.users.find((u) => u.email === email)?.id
    if (!userId) {
      return NextResponse.json({ error: 'User lookup failed' }, { status: 500 })
    }
    // Make sure metadata + password match what we expect, in case an earlier
    // run left the fixture in a half-state.
    await admin.auth.admin.updateUserById(userId, {
      password: TEST_PASSWORD,
      user_metadata: { onboarding_completed: true, full_name: 'E2E Fixture' },
    })
  }

  await admin.from('profiles').upsert(
    { id: userId!, onboarding_completed: true, full_name: 'E2E Fixture' },
    { onConflict: 'id' },
  )

  // Sign in via the SSR client so Supabase writes the auth cookies onto the
  // response — that's the whole point of this endpoint.
  const ssr = createClient()
  const { error: signInErr } = await ssr.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  })
  if (signInErr) {
    return NextResponse.json({ error: signInErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId })
}
