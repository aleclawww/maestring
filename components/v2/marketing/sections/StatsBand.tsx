/**
 * Spec band — full-bleed section on the deep gradient.
 *
 * Iteration 3 (2026-05-24). History:
 *   v1: fake user-outcome metrics (94% pass rate, 3,200+ students). Cut.
 *   v2: 4-stat grid (1,800 questions, 40+ labs, 6 certs, 2026 aligned).
 *       Cut after truth audit — labs don't exist and only 1 cert is
 *       covered. The header promised "specs you can verify, no claims
 *       we can't show the spreadsheet for"; the grid itself was
 *       unchecked. Self-defeating.
 *   v3: single statement. Leads on the only big number that survived
 *       audit (questions), folds in concepts as texture (142, from
 *       lib/knowledge-graph/aws-saa.ts), closes on the positioning
 *       line — "one certification, covered properly" turns scope from
 *       perceived weakness into the flag we plant. Depth over breadth,
 *       in a market drowning in breadth-bragging.
 *
 * Do NOT pad this back to a 4-grid for visual balance. Breaking the
 * commodity-edtech big-numbers-band pattern IS the differentiation.
 */

// Moved to lib/constants/marketing.ts on 2026-05-24 so the Pricing
// surfaces (/pricing route + landing Pricing section) share the same
// number — otherwise the value can desync across the three places it
// appears, which is exactly the "same claim, three different copies"
// failure mode that bit us with the card-required claim earlier today.
import { QUESTION_COUNT_PROD } from '@/lib/constants/marketing'

export function StatsBand() {
  return (
    <section className="relative overflow-hidden bg-v2-gradient-deep py-20 sm:py-24 lg:py-28">
      {/* Subtle decorative orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="max-w-[640px]">
          <div className="inline-flex items-center gap-2">
            <span aria-hidden className="h-px w-8 bg-white/40" />
            <span className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-white/70">
              What's in the box
            </span>
          </div>
          <h2 className="v2-display mt-3 text-[36px] text-white sm:text-[44px] lg:text-[52px]">
            The product, in{' '}
            <span
              style={{
                background:
                  'linear-gradient(135deg, #C4B5FD 0%, #FBCFE8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              checkable numbers.
            </span>
          </h2>
          <p className="mt-4 max-w-[480px] text-[16px] leading-[1.7] text-white/70">
            Specs you can verify on day one — no claims about pass rates we
            can't show you the spreadsheet for.
          </p>
        </div>

        {/*
          One statement replacing what was a 4-number grid. The big
          number a reader can size up (questions) leads, the texture
          number (concepts) sits in the middle, the positioning punch
          ("covered properly") lands at the close in gradient — same
          cadence as the Hero and Features H2s. max-w-[920px] keeps the
          line wrapping intentional on desktop; on lg+ the close lands
          on its own visual beat.
        */}
        <p className="mt-14 v2-display max-w-[920px] text-[40px] leading-[1.15] tracking-v2-display text-white sm:mt-16 sm:text-[52px] lg:text-[64px]">
          {QUESTION_COUNT_PROD.toLocaleString()} questions.{' '}
          <span className="text-white/85">142 concepts.</span>{' '}
          One certification,{' '}
          <span
            style={{
              background:
                'linear-gradient(135deg, #C4B5FD 0%, #FBCFE8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            covered properly.
          </span>
        </p>
      </div>
    </section>
  )
}
