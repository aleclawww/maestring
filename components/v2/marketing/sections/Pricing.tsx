/**
 * Pricing — three tiers in a row.
 *
 * The middle tier (Pro) is the highlighted one: scaled 105% on desktop, ring
 * in brand color, "Most popular" gradient pill above the title. Per the
 * Corporate Trust signature, this is one of two places we let the gradient
 * speak loudest (the other is the hero CTA).
 */
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Card, Button, Pill, Eyebrow } from '@/components/v2'

interface Tier {
  name: string
  price: string
  cadence: string
  description: string
  features: string[]
  cta: string
  href: string
  highlight?: boolean
}

// NOTE: A "Lifetime" tier ($119 one-time) used to be the first card here.
// It was removed 2026-05-23 — pre-launch — because the checkout for it was
// never wired end-to-end (no LemonSqueezy variant, no order_created webhook
// handler, no entitlement on the lifetime plan). Keeping the card visible
// with a 'Buy lifetime access' button that doesn't process payment would
// have been a credibility tax we couldn't afford at the moment of seeking
// the first real beta users.
//
// To restore Lifetime later: re-add the tier object to this array, AND
// implement the missing checkout chain (LemonSqueezy variant + order_created
// handler + plan='lifetime' branch in getEntitlement). Do not re-add it
// here without the other half — it's the exact failure mode this comment
// is meant to prevent.

const TIERS: Tier[] = [
  {
    name: 'Pro',
    price: '$29',
    cadence: 'per month',
    description: 'SAA-C03 today, every future cert as we ship them.',
    features: [
      'Full SAA-C03 access today',
      'Every future cert at no extra cost',
      '2,000+ exam-pattern questions per cert',
      'FSRS-4.5 spaced repetition',
      '9-phase Coach (Calibration → Mastery)',
      '65-question mock exam simulator',
      'Cancel anytime',
    ],
    cta: 'Start 7-day free trial',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Teams',
    price: 'Custom',
    cadence: 'volume pricing',
    description: 'For engineering teams of 5+. Reporting, SSO, invoiced billing.',
    features: [
      'Everything in Pro, per seat',
      'Org-level analytics',
      'Invoiced billing + PO',
      'Dedicated success manager',
    ],
    cta: 'Contact sales',
    href: 'mailto:hello@maestring.com',
  },
]

export function Pricing() {
  return (
    <section
      className="border-t border-v2-border-subtle py-20 sm:py-24 lg:py-28"
      id="pricing"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mx-auto max-w-[680px] text-center">
          <Eyebrow align="center">Pricing</Eyebrow>
          <h2 className="v2-display mt-3 text-[36px] sm:text-[44px] lg:text-[52px]">
            One honest price.{' '}
            <span className="v2-text-gradient">No tricks.</span>
          </h2>
          {/*
            Placeholder copy. Founder is rewriting this together with the
            Hero subhead during the landing rewrite (paso 2) so the
            pricing-section voice and the hero thesis tell the same story.
            Do not edit in isolation.
          */}
          <p className="mt-5 text-[17px] leading-[1.7] text-v2-foreground-muted">
            Pass the AWS Solutions Architect Associate. Cancel anytime.
          </p>
        </div>

        {/*
          Was md:grid-cols-3 when Lifetime existed as a tier. With only
          Pro + Teams, 2 columns centered reads more deliberate than two
          cards floating in a 3-column grid with an empty third column.
          md:max-w-[820px] + mx-auto centers the pair within the parent
          1200px container without altering spacing math elsewhere.
        */}
        <div className="mt-16 grid grid-cols-1 items-stretch gap-6 md:mx-auto md:max-w-[820px] md:grid-cols-2 md:gap-5 lg:gap-6">
          {TIERS.map((t) => (
            <Card
              key={t.name}
              tone={t.highlight ? 'emphasized' : 'default'}
              padding="lg"
              className={
                t.highlight
                  ? 'relative md:scale-105 md:shadow-v2-elevated'
                  : ''
              }
            >
              {t.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Pill tone="gradient" size="md">
                    <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                      Most popular
                    </span>
                  </Pill>
                </div>
              )}

              <div className="flex h-full flex-col">
                <div>
                  <h3 className="text-[18px] font-bold text-v2-foreground">
                    {t.name}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-v2-foreground-muted">
                    {t.description}
                  </p>
                </div>

                {/* Price block */}
                <div className="mt-7 flex items-baseline gap-2">
                  <span className="v2-display text-[44px] leading-none text-v2-foreground sm:text-[48px]">
                    {t.price}
                  </span>
                  <span className="text-[14px] text-v2-foreground-muted">
                    {t.cadence}
                  </span>
                </div>

                {/* CTA */}
                <div className="mt-6">
                  <Link href={t.href} className="block">
                    <Button
                      variant={t.highlight ? 'primary' : 'secondary'}
                      size="lg"
                      className="w-full"
                    >
                      {t.cta}
                    </Button>
                  </Link>
                </div>

                {/* Features */}
                <ul className="mt-7 flex-1 space-y-3 border-t border-v2-border-subtle pt-7">
                  {t.features.map((f) => (
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
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-[13px] text-v2-foreground-muted">
          All prices in EUR. VAT added at checkout where applicable. Cancel
          your subscription any time — you keep access until the end of the
          current period.
        </p>
      </div>
    </section>
  )
}
