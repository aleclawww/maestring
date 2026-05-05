import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Check, Lock, Rocket } from 'lucide-react'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { getEntitlement } from '@/lib/subscription/check'
import { Card, BlurBlob, Pill } from '@/components/v2'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { buttonVariants } from '@/components/v2/button-variants'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Start your free trial' }

export default async function TrialRequiredPage() {
  const user = await requireAuthenticatedUser()
  const ent = await getEntitlement(user.id)
  // If they're not gated, they don't need this page — back to the app.
  if (
    ent.kind === 'trialing' ||
    ent.kind === 'active' ||
    ent.kind === 'exploring'
  ) {
    redirect('/dashboard')
  }

  const reason = ent.reason

  const headline =
    reason === 'preview_exhausted'
      ? "You're hooked. Now make it stick."
      : reason === 'past_due'
        ? 'Update your payment method'
        : reason === 'canceled'
          ? 'Reactivate your subscription'
          : 'Your subscription has ended'

  const body =
    reason === 'preview_exhausted'
      ? "You've completed the free preview — calibration, a handful of questions, the Coach. Start your 7-day trial to unlock the full curriculum, FSRS scheduling, and the mock exam. $0 today, $29 after day 7 only if you don't cancel."
      : reason === 'past_due'
        ? 'Your last payment failed. Update your card in the billing portal to restore access.'
        : reason === 'canceled'
          ? 'Your subscription is canceled. Resubscribe to regain access.'
          : 'Your trial or subscription has ended. Resubscribe to continue.'

  const Icon = reason === 'preview_exhausted' ? Rocket : Lock

  return (
    <div className="theme-v2 relative isolate min-h-screen overflow-hidden bg-v2-surface-subtle">
      <BlurBlob className="-left-40 -top-32" size={520} opacity={0.25} />
      <BlurBlob
        className="-right-40 top-40"
        background="var(--v2-gradient-brand-soft)"
        size={460}
        opacity={0.55}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[640px] items-center justify-center px-6 py-16">
        <div className="w-full">
          <Card padding="lg" tone="emphasized" className="sm:p-10">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-gradient-brand text-white shadow-v2-button">
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              {reason === 'preview_exhausted' && (
                <Pill tone="brand" size="md" className="mt-5">
                  <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                    Preview complete
                  </span>
                </Pill>
              )}
              <h1 className="v2-display mt-5 text-[28px] sm:text-[34px]">
                {headline}
              </h1>
              <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-[1.65] text-v2-foreground-muted">
                {body}
              </p>
            </div>

            <div className="mt-7 rounded-xl border border-v2-border-subtle bg-v2-surface-subtle/60 p-5">
              <p className="text-[13px] font-bold text-v2-foreground">
                What you get on day 1
              </p>
              <ul className="mt-3 space-y-2">
                {[
                  'Full 142-concept SAA-C03 syllabus',
                  '9-phase Coach (Calibration → Mastery)',
                  '2,000+ pre-generated exam-pattern questions',
                  'FSRS-4.5 spaced repetition',
                  'Knowledge Map + flashcards',
                  '65-question mock exam',
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[13px] text-v2-foreground"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 space-y-2">
              <UpgradeButton
                plan="monthly"
                className={cn(
                  buttonVariants({ variant: 'primary', size: 'lg' }),
                  'w-full',
                )}
              >
                {reason === 'preview_exhausted'
                  ? 'Start 7-day free trial'
                  : 'Resubscribe'}
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </UpgradeButton>
              <p className="text-center text-[11px] leading-[1.6] text-v2-foreground-subtle">
                Card on file required · $0 today · Reminder email 3 days before
                charge · Cancel any time from Settings → Billing · No charge if
                you cancel within 7 days
              </p>
            </div>

            <div className="mt-7 border-t border-v2-border-subtle pt-5 text-center">
              <Link
                href="/"
                className="text-[12px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
              >
                ← Back to home
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
