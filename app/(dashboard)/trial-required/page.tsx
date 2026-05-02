import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { getEntitlement } from '@/lib/subscription/check'
import { Card, CardContent } from '@/components/ui/Card'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Start your free trial' }

export default async function TrialRequiredPage() {
  const user = await requireAuthenticatedUser()
  const ent = await getEntitlement(user.id)
  // If they're not gated, they don't need this page — back to the app.
  if (ent.kind === 'trialing' || ent.kind === 'active' || ent.kind === 'exploring') {
    redirect('/dashboard')
  }

  const reason = ent.reason

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full">
        <Card className="border-primary/30">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="inline-block text-5xl mb-4">
                {reason === 'preview_exhausted' ? '🚀' : '🔓'}
              </div>
              <h1 className="text-2xl font-bold mb-2">
                {reason === 'preview_exhausted' && "You're hooked. Now make it stick."}
                {reason === 'past_due' && 'Update your payment method'}
                {reason === 'canceled' && 'Reactivate your subscription'}
                {reason === 'expired' && 'Your subscription has ended'}
              </h1>
              <p className="text-text-secondary text-sm">
                {reason === 'preview_exhausted'
                  ? "You've completed the free preview — calibration, a handful of questions, the Coach. Start your 7-day trial to unlock the full curriculum, FSRS scheduling, and the mock exam. $0 today, $19 after day 7 only if you don't cancel."
                  : reason === 'past_due'
                    ? 'Your last payment failed. Update your card in the billing portal to restore access.'
                    : reason === 'canceled'
                      ? 'Your subscription is canceled. Resubscribe to regain access.'
                      : 'Your trial or subscription has ended. Resubscribe to continue.'}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface/40 p-5 space-y-3">
              <div className="text-sm font-semibold">What you get on day 1</div>
              <ul className="text-xs space-y-1.5 text-text-secondary">
                <li>✓ Full 142-concept SAA-C03 syllabus</li>
                <li>✓ 9-phase Coach (Calibration → Mastery)</li>
                <li>✓ 2,000+ pre-generated exam-pattern questions</li>
                <li>✓ FSRS-4.5 spaced repetition</li>
                <li>✓ Knowledge Map + flashcards</li>
                <li>✓ 65-question mock exam</li>
                <li>✓ PDF upload + RAG-powered questions from your notes</li>
              </ul>
            </div>

            <div className="space-y-2">
              <UpgradeButton
                plan="monthly"
                className="btn-primary w-full text-center py-3 rounded-lg block"
              >
                {reason === 'preview_exhausted' ? 'Start 7-day free trial' : 'Resubscribe'}
              </UpgradeButton>
              <p className="text-[11px] text-text-secondary text-center leading-relaxed">
                Card on file required · $0 today · Reminder email 3 days before charge ·
                Cancel any time from Settings → Billing · No charge if you cancel within 7 days
              </p>
            </div>

            <div className="text-center pt-2 border-t border-border">
              <Link href="/" className="text-xs text-text-secondary hover:underline">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-text-secondary mt-4">
          Pass-or-refund guarantee: hit 80+ Readiness with us, fail the exam, get every penny back.
        </p>
      </div>
    </div>
  )
}
