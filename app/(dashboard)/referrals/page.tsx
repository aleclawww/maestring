import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/Card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Programa de Referidos' }

export default async function ReferralsPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const [{ data: profile }, { data: referrals }] = await Promise.all([
    supabase.from('profiles').select('referral_code').eq('id', user.id).single(),
    supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id),
  ])

  const referralCode = profile?.referral_code ?? ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maestring.com'
  const referralUrl = `${siteUrl}/r/${referralCode}`
  const converted = (referrals ?? []).filter(r => r.converted_at).length

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary mb-1">Programa de Referidos</h1>
        <p className="text-sm text-text-secondary">
          Invita a amigos y ambos reciben 7 días de Pro gratis.
        </p>
      </div>

      {/* Referral link */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-semibold text-text-primary mb-3">Tu enlace de referido</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="input-field font-mono text-sm flex-1"
            />
            <button
              onClick={() => navigator.clipboard.writeText(referralUrl)}
              className="btn-outline px-3 flex-shrink-0"
            >
              Copiar
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Código: <span className="font-mono font-bold text-text-primary">{referralCode}</span>
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{referrals?.length ?? 0}</p>
            <p className="text-xs text-text-muted">Referidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-success">{converted}</p>
            <p className="text-xs text-text-muted">Convertidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{converted * 7}</p>
            <p className="text-xs text-text-muted">Días Pro ganados</p>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">¿Cómo funciona?</h2>
          <div className="space-y-3">
            {[
              { step: '1', desc: 'Comparte tu enlace único con amigos' },
              { step: '2', desc: 'Tu amigo se registra usando tu enlace' },
              { step: '3', desc: 'Cuando se suscriben a Pro, ambos reciben 7 días gratis' },
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
