import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { ShareBlock } from './ShareBlock'
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
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const referralUrl = referralCode ? `${siteUrl}/r/${referralCode}` : ''

  const rows = referrals ?? []
  const converted = rows.filter(r => r.converted_at).length
  const pending = rows.length - converted

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary mb-1">Refer a friend</h1>
        <p className="text-sm text-text-secondary">
          Invite someone. When they subscribe to Pro, you both get 7 days of Pro free.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {referralCode ? (
            <ShareBlock url={referralUrl} code={referralCode} />
          ) : (
            <p className="text-sm text-text-muted">
              Your referral code is still being provisioned. Reload in a moment.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{rows.length}</p>
            <p className="text-xs text-text-muted">Signed up</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-success">{converted}</p>
            <p className="text-xs text-text-muted">Converted to Pro</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{converted * 7}</p>
            <p className="text-xs text-text-muted">Pro days earned</p>
          </CardContent>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card>
          <div className="border-b border-border px-6 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Your referrals ({rows.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {rows.map(r => (
              <div key={r.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm text-text-primary">
                    User <span className="font-mono">{r.referred_id?.slice(0, 8) ?? '—'}…</span>
                  </p>
                  <p className="text-xs text-text-muted">
                    Signed up {formatRelativeTime(r.created_at)}
                  </p>
                </div>
                {r.converted_at ? (
                  <Badge variant="success">Converted · +7d</Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
              </div>
            ))}
          </div>
          {pending > 0 && (
            <div className="border-t border-border bg-surface-2 px-6 py-2 text-[11px] text-text-muted">
              Credit applies once a pending referral starts a paid Pro subscription.
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">How it works</h2>
          <div className="space-y-3">
            {[
              { step: '1', desc: 'Share your unique link with a friend.' },
              { step: '2', desc: 'They sign up through the link.' },
              { step: '3', desc: 'When they subscribe to Pro, you both get 7 free days.' },
            ].map(({ step, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {step}
                </div>
                <p className="text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
