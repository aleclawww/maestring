export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCheckout } from '@/lib/lemonsqueezy/client'
import { logger } from '@/lib/logger'

export async function POST() {
  const user = await requireAuthenticatedUser()

  // Pull email + name from the profile so the LS checkout pre-fills (better UX,
  // and if the user already has an LS customer record under the same email
  // their card history is recognized).
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const email = (profile?.email as string | null) ?? user.email ?? undefined
  const name = (profile?.full_name as string | null) ?? undefined

  try {
    const { url } = await createCheckout({
      userId: user.id,
      email: email ?? undefined,
      name,
      successUrl: 'https://maestring.com/dashboard?checkout=success',
    })
    return NextResponse.json({ url })
  } catch (err) {
    logger.error({ err, userId: user.id }, 'lemonsqueezy: createCheckout failed')
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 })
  }
}
