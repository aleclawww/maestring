import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Infinity as InfinityIcon, Sparkles } from 'lucide-react'
import { FAQ } from '@/components/v2/marketing/sections'
import { Nav, Footer } from '@/components/v2/marketing'
import { Card, Eyebrow, BlurBlob, Pill, Button } from '@/components/v2'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { buttonVariants } from '@/components/v2/button-variants'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pricing — Maestring',
  description:
    "Pay $119 once for lifetime access to one cert, or $29/month for every cert. Free 7-day trial of Pro. Cancel anytime. FSRS spaced repetition, 2,000+ exam-pattern questions.",
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — Maestring',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const LIFETIME_FEATURES = [
  'Lifetime access to one certification',
  'Full syllabus · 142 concepts',
  '2,000+ exam-pattern questions',
  'FSRS-4.5 spaced repetition scheduler',
  '65-question mock exam simulator',
  'Knowledge map + flashcards',
  'No subscription, no renewals',
]

const PRO_FEATURES = [
  'All current and future certifications',
  '2,000+ exam-pattern questions per cert',
  'FSRS-4.5 spaced repetition scheduler',
  '9-phase Coach (Calibration → Mastery)',
  '65-question mock exam simulator',
  'Cognitive fingerprint calibration',
  'Knowledge map + flashcards',
  'Email digests + priority support',
]

export default function PricingPage() {
  return (
    <div className="theme-v2">
      <Nav />
      <main>
        {/* Slim hero */}
        <section className="relative isolate overflow-hidden">
          <BlurBlob className="-left-32 -top-24" size={460} opacity={0.22} animated />
          <BlurBlob
            className="-right-40 top-32"
            background="var(--v2-gradient-brand-soft)"
            size={420}
            opacity={0.5}
          />

          <div className="relative z-10 mx-auto max-w-[1080px] px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-[680px] text-center">
              <Eyebrow align="center">Pricing</Eyebrow>
              <h1 className="v2-display mt-3 text-[40px] sm:text-[52px] lg:text-[60px]">
                Pay once for life,{' '}
                <span className="v2-text-gradient">or unlock every cert.</span>
              </h1>
              <p className="mt-5 text-[17px] leading-[1.7] text-v2-foreground-muted sm:text-[18px]">
                $119 once, lifetime access to a single certification — or $29
                per month for every cert with a 7-day free trial. No tricks.
              </p>
            </div>
          </div>
        </section>

        {/* Two-card pricing */}
        <section className="relative pb-12">
          <div className="mx-auto max-w-[1080px] px-6">
            <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
              {/* Lifetime — left */}
              <Card padding="lg" className="flex flex-col sm:p-10">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
                    <InfinityIcon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <Pill tone="neutral" size="md">
                    <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                      One-time
                    </span>
                  </Pill>
                </div>

                <h2 className="mt-6 text-[22px] font-bold text-v2-foreground">
                  Lifetime access
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-v2-foreground-muted">
                  Pay once. Keep access to one certification forever. No
                  renewals, no surprises.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="v2-display text-[56px] leading-none text-v2-foreground sm:text-[64px]">
                    $119
                  </span>
                  <span className="text-[15px] text-v2-foreground-muted">
                    once
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-v2-foreground-muted">
                  One-time payment · lifetime updates to that cert
                </p>

                <Link href="/signup?plan=lifetime" className="mt-6 block">
                  <Button variant="secondary" size="lg" className="w-full">
                    Buy lifetime access
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </Button>
                </Link>

                <ul className="mt-7 flex-1 space-y-3 border-t border-v2-border-subtle pt-7">
                  {LIFETIME_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-[14px] leading-[1.55] text-v2-foreground"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
                        <Check className="h-3 w-3" strokeWidth={2.75} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Pro — right, highlighted */}
              <Card
                tone="emphasized"
                padding="lg"
                className="relative flex flex-col overflow-hidden sm:p-10"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Pill tone="gradient" size="md">
                    <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                    <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                      Most popular · 7-day free trial
                    </span>
                  </Pill>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-gradient-brand text-white shadow-v2-button">
                    <Sparkles className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <Pill tone="brand" size="md">
                    <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                      Subscription
                    </span>
                  </Pill>
                </div>

                <h2 className="mt-6 text-[22px] font-bold text-v2-foreground">
                  Maestring Pro
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-v2-foreground-muted">
                  Every cert, every lab. Try free for 7 days, cancel anytime.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="v2-display text-[56px] leading-none text-v2-foreground sm:text-[64px]">
                    $29
                  </span>
                  <span className="text-[15px] text-v2-foreground-muted">
                    / month
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-v2-foreground-muted">
                  After the 7-day free trial · cancel any time
                </p>

                <div className="mt-6">
                  <UpgradeButton
                    plan="monthly"
                    className={cn(
                      buttonVariants({ variant: 'primary', size: 'lg' }),
                      'w-full',
                    )}
                  >
                    Start 7-day free trial
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </UpgradeButton>
                </div>

                <ul className="mt-7 flex-1 space-y-3 border-t border-v2-border-subtle pt-7">
                  {PRO_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-[14px] leading-[1.55] text-v2-foreground"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
                        <Check className="h-3 w-3" strokeWidth={2.75} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <p className="mt-8 text-center text-[13px] text-v2-foreground-muted">
              Pro: card on file required · $0 today · Reminder email 3 days
              before the first charge · Cancel any time from Settings → Billing.
            </p>

            <p className="mt-3 text-center text-[13px] text-v2-foreground-muted">
              Payments processed securely by Lemon Squeezy. By subscribing you
              agree to our{' '}
              <Link
                href="/legal/terms"
                className="font-semibold text-v2-foreground hover:text-v2-brand"
              >
                Terms
              </Link>{' '}
              and{' '}
              <Link
                href="/legal/privacy"
                className="font-semibold text-v2-foreground hover:text-v2-brand"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Free + Teams secondary band */}
        <section className="border-t border-v2-border-subtle bg-v2-surface-subtle py-20 sm:py-24">
          <div className="mx-auto max-w-[1000px] px-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Card padding="lg">
                <Pill tone="neutral" size="md">
                  <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                    Free
                  </span>
                </Pill>
                <h3 className="mt-4 text-[20px] font-bold text-v2-foreground">
                  Try without paying
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
                  Cognitive fingerprint calibration, the first module of
                  SAA-C03, and 50 sample exam-style questions. No card.
                </p>
                <Link href="/signup" className="mt-6 block">
                  <Button variant="secondary" size="md" className="w-full">
                    Create free account
                  </Button>
                </Link>
              </Card>

              <Card padding="lg">
                <Pill tone="neutral" size="md">
                  <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                    Teams
                  </span>
                </Pill>
                <h3 className="mt-4 text-[20px] font-bold text-v2-foreground">
                  For 5+ engineers
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
                  Org analytics, invoiced billing, dedicated success manager.
                  Volume pricing per seat.
                </p>
                <a href="mailto:hello@maestring.com" className="mt-6 block">
                  <Button variant="secondary" size="md" className="w-full">
                    Contact sales
                  </Button>
                </a>
              </Card>
            </div>
          </div>
        </section>

        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
