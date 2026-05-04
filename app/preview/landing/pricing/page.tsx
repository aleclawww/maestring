/**
 * /preview/landing/pricing — standalone pricing page.
 *
 * Composition: hero strip with eyebrow + headline → reuse the Pricing
 * section from the landing → comparison band (what's in each tier) → FAQ.
 * The Pricing section already carries the 3 tier cards; we surround it
 * with a more focused frame for visitors who arrive directly here.
 */
import { Check, X } from 'lucide-react'
import { Pricing, FAQ } from '@/components/v2/marketing/sections'
import { Eyebrow, BlurBlob, Card } from '@/components/v2'

export default function PricingPage() {
  return (
    <>
      {/* Slim hero — sets context without competing with the price cards */}
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
            <h1 className="v2-display mt-3 text-[40px] sm:text-[52px] lg:text-[64px]">
              Pay once for one cert,{' '}
              <span className="v2-text-gradient">or get them all.</span>
            </h1>
            <p className="mt-5 text-[17px] leading-[1.7] text-v2-foreground-muted sm:text-[18px]">
              Two ways to pay, no contracts. Subscriptions cancel any time and
              keep working until the end of the period you've already paid for.
            </p>
          </div>
        </div>
      </section>

      {/* The actual tier cards — reused from the landing */}
      <Pricing />

      {/* Comparison */}
      <ComparisonTable />

      {/* FAQ */}
      <FAQ />
    </>
  )
}

interface CompareRow {
  label: string
  single: boolean | string
  pro: boolean | string
  teams: boolean | string
}

const ROWS: Array<{ heading: string; rows: CompareRow[] }> = [
  {
    heading: 'Content',
    rows: [
      { label: 'One certification', single: true, pro: true, teams: true },
      { label: 'All current and future certs', single: false, pro: true, teams: true },
      { label: 'Adaptive AI question generator', single: true, pro: true, teams: true },
      { label: 'Hands-on labs in your AWS account', single: true, pro: true, teams: true },
      { label: 'Mock exams (official format)', single: 'Unlimited', pro: 'Unlimited', teams: 'Unlimited' },
    ],
  },
  {
    heading: 'Workflow',
    rows: [
      { label: 'FSRS spaced repetition scheduler', single: true, pro: true, teams: true },
      { label: 'Domain mastery heatmap', single: true, pro: true, teams: true },
      { label: 'Pause subscription (up to 90 days)', single: false, pro: true, teams: true },
      { label: 'Org analytics dashboard', single: false, pro: false, teams: true },
      { label: 'Single sign-on (SAML / SCIM)', single: false, pro: false, teams: true },
    ],
  },
  {
    heading: 'Support',
    rows: [
      { label: 'Community Discord', single: true, pro: true, teams: true },
      { label: 'Priority email support', single: false, pro: true, teams: true },
      { label: 'Dedicated success manager', single: false, pro: false, teams: true },
      { label: 'Invoiced billing + PO', single: false, pro: false, teams: true },
    ],
  },
]

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
        <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-v2-surface-subtle text-v2-foreground-subtle">
        <X className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
    )
  }
  return (
    <span className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-foreground">
      {value}
    </span>
  )
}

function ComparisonTable() {
  return (
    <section className="border-t border-v2-border-subtle bg-v2-surface-subtle py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1080px] px-6">
        <div className="max-w-[680px]">
          <Eyebrow>Compare</Eyebrow>
          <h2 className="v2-display mt-3 text-[32px] sm:text-[40px]">
            Every line, side by side.
          </h2>
          <p className="mt-4 max-w-[520px] text-[16px] leading-[1.7] text-v2-foreground-muted">
            What you get on each plan — no asterisks, no "starting at" pricing,
            no upsells once you're in.
          </p>
        </div>

        <Card padding="none" className="mt-12 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-end border-b border-v2-border bg-v2-surface px-5 py-5 sm:px-7">
            <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
              Feature
            </span>
            {[
              { name: 'Single', sub: '€149 once' },
              { name: 'Pro', sub: '€29 / mo', highlight: true },
              { name: 'Teams', sub: 'Custom' },
            ].map((t) => (
              <div key={t.name} className="text-center">
                <div
                  className={
                    t.highlight
                      ? 'text-[14px] font-bold text-v2-brand'
                      : 'text-[14px] font-bold text-v2-foreground'
                  }
                >
                  {t.name}
                </div>
                <div className="mt-0.5 font-v2-mono text-[11px] text-v2-foreground-subtle">
                  {t.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          {ROWS.map((group) => (
            <div key={group.heading}>
              <div className="border-b border-v2-border-subtle bg-v2-surface-subtle px-5 py-2.5 sm:px-7">
                <span className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
                  {group.heading}
                </span>
              </div>
              {group.rows.map((r, i) => (
                <div
                  key={r.label}
                  className={`grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center px-5 py-4 sm:px-7 ${
                    i !== group.rows.length - 1
                      ? 'border-b border-v2-border-subtle'
                      : ''
                  }`}
                >
                  <span className="text-[14px] text-v2-foreground">
                    {r.label}
                  </span>
                  <div className="flex justify-center">
                    <Cell value={r.single} />
                  </div>
                  <div className="flex justify-center">
                    <Cell value={r.pro} />
                  </div>
                  <div className="flex justify-center">
                    <Cell value={r.teams} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </Card>
      </div>
    </section>
  )
}
