import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@/lib/utils'
import { ShareBlock } from './ShareBlock'
import { Card, Eyebrow, Badge } from '@/components/v2'
import { Gift } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Referrals' }

export default async function ReferralsPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const [{ data: profile }, { data: referrals }] = await Promise.all([
    supabase.from('profiles').select('referral_code').eq('id', user.id).single(),
    supabase
      .from('referrals')
      .select('id, created_at, referred_id, converted_at, credit_applied')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const referralCode = profile?.referral_code ?? ''
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const referralUrl = referralCode ? `${siteUrl}/r/${referralCode}` : ''

  const rows = referrals ?? []
  const converted = rows.filter((r) => r.converted_at).length
  const pending = rows.length - converted

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Eyebrow>Referrals</Eyebrow>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[36px]">
          Invite a friend, <span className="v2-text-gradient">both win.</span>
        </h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          Share your unique link. When they subscribe to Pro, you both get 7
          days of Pro free.
        </p>
      </header>

      {/* Share block */}
      <Card padding="lg">
        {referralCode ? (
          <ShareBlock url={referralUrl} code={referralCode} />
        ) : (
          <p className="text-[14px] text-v2-foreground-muted">
            Your referral code is still being provisioned. Reload in a moment.
          </p>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Signed up" value={rows.length.toString()} tone="brand" />
        <StatCard
          label="Converted to Pro"
          value={converted.toString()}
          tone="success"
        />
        <StatCard
          label="Pro days earned"
          value={(converted * 7).toString()}
          tone="brand"
        />
      </div>

      {/* List */}
      {rows.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-v2-border-subtle px-5 py-3 sm:px-6">
            <h2 className="text-[14px] font-bold text-v2-foreground">
              Your referrals · {rows.length}
            </h2>
          </div>
          <ul className="divide-y divide-v2-border-subtle">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="text-[14px] text-v2-foreground">
                    User{' '}
                    <span className="font-v2-mono text-v2-foreground-muted">
                      {r.referred_id?.slice(0, 8) ?? '—'}…
                    </span>
                  </p>
                  <p className="mt-0.5 font-v2-mono text-[11px] text-v2-foreground-subtle">
                    Signed up {formatRelativeTime(r.created_at)}
                  </p>
                </div>
                {r.converted_at ? (
                  <Badge tone="success" size="sm">
                    Converted · +7d
                  </Badge>
                ) : (
                  <Badge tone="warning" size="sm">
                    Pending
                  </Badge>
                )}
              </li>
            ))}
          </ul>
          {pending > 0 && (
            <div className="border-t border-v2-border-subtle bg-v2-surface-subtle px-5 py-3 font-v2-mono text-[11px] text-v2-foreground-subtle sm:px-6">
              Credit applies once a pending referral starts a paid Pro
              subscription.
            </div>
          )}
        </Card>
      )}

      {/* How it works */}
      <Card padding="lg">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
            <Gift className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-v2-foreground">
              How it works
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                'Share your unique link with a friend.',
                'They sign up through the link.',
                'When they subscribe to Pro, you both get 7 free days.',
              ].map((desc, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-v2-brand-soft font-v2-mono text-[11px] font-bold text-v2-brand">
                    {i + 1}
                  </span>
                  <p className="text-[14px] leading-[1.55] text-v2-foreground">
                    {desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'brand' | 'success'
}) {
  const valueClass =
    tone === 'success' ? 'text-v2-success' : 'text-v2-foreground'
  return (
    <Card padding="md" className="text-center">
      <p className={`v2-display text-[28px] leading-none ${valueClass}`}>
        {value}
      </p>
      <p className="mt-2 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        {label}
      </p>
    </Card>
  )
}
