import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Pricing, FAQ } from '@/components/v2/marketing/sections'
import { Nav, Footer } from '@/components/v2/marketing'
import { Card, Eyebrow, BlurBlob, Pill, Button } from '@/components/v2'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { buttonVariants } from '@/components/v2/Button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pricing — Maestring',
  description:
    'Free trial, $19/month after. The full Maestring system: FSRS spaced repetition, 2,000+ exam-pattern questions, mock exam simulator. Cancel anytime.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — Maestring',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

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
                Try it free,{' '}
                <span className="v2-text-gradient">subscribe if it works.</span>
              </h1>
              <p className="mt-5 text-[17px] leading-[1.7] text-v2-foreground-muted sm:text-[18px]">
                Seven-day free trial of every Pro feature. No card. After that
                $19 per month, cancel any time from settings.
              </p>
            </div>
          </div>
        </section>

        {/* Hero pricing card — single tier with the real Stripe CTA */}
        <section className="relative pb-12">
          <div className="mx-auto max-w-[640px] px-6">
            <Card
              tone="emphasized"
              padding="lg"
              className="relative overflow-hidden sm:p-10"
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Pill tone="gradient" size="md">
                  <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                    Most popular · 7-day free trial
                  </span>
                </Pill>
              </div>

              <div className="text-center">
                <h2 className="text-[22px] font-bold text-v2-foreground">
                  Maestring Pro
                </h2>
                <div className="mt-5 flex items-baseline justify-center gap-2">
                  <span className="v2-display text-[64px] leading-none text-v2-foreground sm:text-[72px]">
                    $19
                  </span>
                  <span className="text-[16px] text-v2-foreground-muted">
                    / month
                  </span>
                </div>
                <p className="mt-2 text-[14px] text-v2-foreground-muted">
                  After the 7-day free trial · cancel any time
                </p>
              </div>

              <ul className="mx-auto mt-8 max-w-[440px] space-y-3 border-y border-v2-border-subtle py-7">
                {[
                  'Full SAA-C03 syllabus · 142 concepts',
                  '2,000+ exam-pattern questions',
                  'FSRS-4.5 spaced repetition scheduler',
                  '9-phase Coach (Calibration → Mastery)',
                  '65-question mock exam simulator',
                  'Cognitive fingerprint calibration',
                  'Knowledge map + flashcards',
                  'Email digests + priority support',
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-[15px] leading-[1.55] text-v2-foreground"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
                      <Check className="h-3 w-3" strokeWidth={2.75} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
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
                <p className="mt-3 text-center text-[12px] leading-[1.5] text-v2-foreground-subtle">
                  Card on file required · $0 today · Reminder email 3 days before
                  the first charge · Cancel any time from Settings → Billing
                </p>
              </div>
            </Card>

            <p className="mt-8 text-center text-[13px] text-v2-foreground-muted">
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
                  Cognitive fingerprint calibration, the first module of SAA-C03,
                  and 50 sample exam-style questions. No card.
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
