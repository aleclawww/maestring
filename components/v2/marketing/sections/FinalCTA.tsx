/**
 * Final CTA — full-bleed deep gradient with one centered hero CTA.
 *
 * The whole page funnels to this band. White button on the deep gradient
 * is the dramatic contrast moment — Corporate Trust signature for closing
 * sections.
 */
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/v2'

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-v2-gradient-deep py-20 sm:py-24 lg:py-28">
      {/* Atmospheric accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-[400px] w-[400px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(79,70,229,0.4), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[820px] px-6 text-center">
        <div className="inline-flex items-center gap-2">
          <span aria-hidden className="h-px w-8 bg-white/40" />
          <span className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-white/70">
            Start today
          </span>
          <span aria-hidden className="h-px w-8 bg-white/40" />
        </div>

        {/*
          H2 rewritten 2026-05-24 — previous "Your next certification is
          six weeks away" was the same fabricated outcome statistic cut
          from FAQ #3 earlier today, resurrected at the most-exposed
          sentence on the page. The new H2 invites an ACTION (the real
          first step in the product) instead of promising a result we
          can't back. Echoes HowItWorks Phase 01.
        */}
        <h2 className="v2-display mt-5 text-[36px] leading-[1.1] text-white sm:text-[44px] lg:text-[56px]">
          Start with the{' '}
          <span
            style={{
              background:
                'linear-gradient(135deg, #C4B5FD 0%, #FBCFE8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            calibration.
          </span>
        </h2>

        {/*
          Subhead — "No credit card" was FALSE (Pro trial requires
          card on file per CLAUDE.md). Same lie was in Hero proof row;
          fixed both in synchronized pass. The new wording tells the
          anxious user exactly how NOT to be charged — counterintuitively
          converts BETTER than the false frictionless promise because
          the anxiety isn't "do I get charged?" but "WILL I forget to
          cancel?" Naming the day-7 deadline addresses the real fear.
          "Keep your progress" ambiguity removed (cancel revokes
          access — only re-sub keeps data).
        */}
        <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
          7-day free trial &mdash; card required, cancel before day 7
          and you&rsquo;re never charged.
        </p>

        {/*
          Single CTA — "Compare plans" cut: dead button (no handler,
          {code}-bug family) + single CTA closes harder than two +
          "compare plans" sent the reader price-shopping when the
          conversion is them committing to try.
        */}
        <div className="mt-9 flex justify-center">
          <Link href="/signup">
            <Button
              size="xl"
              className="rounded-full bg-white text-v2-foreground shadow-v2-elevated hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-v2-elevated"
            >
              Create free account
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </Link>
        </div>

        {/*
          Footer line CUT 2026-05-24. Previously: "Built by AWS-certified
          engineers · Updated weekly" — plural engineers (solo founder,
          same lie cut from FAQ #2) + "Updated weekly" (cadence not
          verified; a specific cadence is falsifiable — if a user notices
          no pool change in a month, "weekly" is a caught lie). Two
          unverified claims under the final CTA = trust damage at the
          moment of conversion. Cut entirely; can be restored as a
          single verifiable fact if founder wants something here.
        */}
      </div>
    </section>
  )
}
