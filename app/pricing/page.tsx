import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Infinity as InfinityIcon,
  Sparkles,
  Users,
} from 'lucide-react'
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
  'Lifetime access to SAA-C03',
  'Full syllabus · 142 concepts',
  '2,000+ exam-pattern questions',
  'FSRS-4.5 spaced repetition scheduler',
  '65-question mock exam simulator',
  'Knowledge map + flashcards',
  'No subscription, no renewals',
]

const PRO_FEATURES = [
  'Full SAA-C03 access today',
  'Every future certification at no extra cost',
  '2,000+ exam-pattern questions per cert',
  'FSRS-4.5 spaced repetition scheduler',
  '9-phase Coach (Calibration → Mastery)',
  '65-question mock exam simulator',
  'Cognitive fingerprint calibration',
  'Knowledge map + flashcards',
]

const TEAMS_FEATURES = [
  'Everything in Pro, per seat',
  'Org-level analytics dashboard',
  'SAML SSO + SCIM provisioning',
  'Invoiced billing + PO support',
  'Dedicated success manager',
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
                $119 once for lifetime SAA-C03, or $29/month for SAA today
                and every future AWS cert as we ship them. 7-day free trial,
                cancel anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Three-tier pricing */}
        <section className="relative pb-12">
          <div className="mx-auto max-w-[1200px] px-6">
            {/* Add top room so the floating "Most popular" pill on Pro isn't
                clipped by Card overflow nor by the section padding. */}
            <div className="grid grid-cols-1 items-stretch gap-6 pt-6 md:grid-cols-3 md:gap-5 lg:gap-6">
              {/* Lifetime — left */}
              <Card padding="lg" className="flex flex-col">
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

                <h2 className="mt-5 text-[18px] font-bold text-v2-foreground">
                  Lifetime SAA-C03
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-v2-foreground-muted">
                  Pay once. Keep access forever. No renewals.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="v2-display text-[44px] leading-none text-v2-foreground sm:text-[48px]">
                    $119
                  </span>
                  <span className="text-[14px] text-v2-foreground-muted">
                    once
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-v2-foreground-muted">
                  One-time payment · lifetime updates
                </p>

                <Link href="/signup?plan=lifetime" className="mt-6 block">
                  <Button variant="secondary" size="lg" className="w-full">
                    Buy lifetime access
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

              {/* Pro — middle, highlighted, scaled up on desktop */}
              <Card
                tone="emphasized"
                padding="lg"
                className="relative flex flex-col md:scale-105 md:shadow-v2-elevated"
              >
                {/* Floating "Most popular" pill — sits above the card top edge.
                    Card has no overflow-hidden so the pill renders fully. */}
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

                <h2 className="mt-5 text-[18px] font-bold text-v2-foreground">
                  Maestring Pro
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-v2-foreground-muted">
                  SAA-C03 today, every future cert as we ship them. 7-day free
                  trial.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="v2-display text-[44px] leading-none text-v2-foreground sm:text-[48px]">
                    $29
                  </span>
                  <span className="text-[14px] text-v2-foreground-muted">
                    / month
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-v2-foreground-muted">
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

              {/* Teams — right */}
              <Card padding="lg" className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-accent-soft-2 text-v2-accent">
                    <Users className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <Pill tone="neutral" size="md">
                    <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                      Teams
                    </span>
                  </Pill>
                </div>

                <h2 className="mt-5 text-[18px] font-bold text-v2-foreground">
                  For 5+ engineers
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-v2-foreground-muted">
                  Org analytics, SSO, invoiced billing. Volume pricing per seat.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="v2-display text-[44px] leading-none text-v2-foreground sm:text-[48px]">
                    Custom
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-v2-foreground-muted">
                  Volume pricing · invoiced billing
                </p>

                <a href="mailto:hello@maestring.com" className="mt-6 block">
                  <Button variant="secondary" size="lg" className="w-full">
                    Contact sales
                  </Button>
                </a>

                <ul className="mt-7 flex-1 space-y-3 border-t border-v2-border-subtle pt-7">
                  {TEAMS_FEATURES.map((f) => (
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

            <p className="mt-10 text-center text-[13px] text-v2-foreground-muted">
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

        {/* Free preview band */}
        <section className="border-t border-v2-border-subtle bg-v2-surface-subtle py-20 sm:py-24">
          <div className="mx-auto max-w-[640px] px-6">
            <Card padding="lg" className="text-center sm:p-10">
              <Pill tone="neutral" size="md" className="mx-auto">
                <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                  Free preview
                </span>
              </Pill>
              <h3 className="v2-display mt-4 text-[24px] sm:text-[28px]">
                Try without paying first
              </h3>
              <p className="mx-auto mt-2 max-w-[480px] text-[14px] leading-[1.65] text-v2-foreground-muted">
                Cognitive fingerprint calibration, the first module of SAA-C03,
                and 50 sample exam-style questions. No card required.
              </p>
              <Link href="/signup" className="mt-6 inline-block">
                <Button variant="secondary" size="md">
                  Create free account
                </Button>
              </Link>
            </Card>
          </div>
        </section>

        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
