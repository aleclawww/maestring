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

        <h2 className="v2-display mt-5 text-[36px] leading-[1.1] text-white sm:text-[44px] lg:text-[56px]">
          Your next certification is{' '}
          <span
            style={{
              background:
                'linear-gradient(135deg, #C4B5FD 0%, #FBCFE8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            six weeks away.
          </span>
        </h2>

        <p className="mx-auto mt-5 max-w-[520px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
          Free for seven days. No credit card. Cancel any time and keep your
          progress.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup">
            <Button
              size="xl"
              className="rounded-full bg-white text-v2-foreground shadow-v2-elevated hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-v2-elevated"
            >
              Create free account
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="xl"
            className="rounded-full text-white hover:bg-white/10 hover:text-white"
          >
            Compare plans
          </Button>
        </div>

        <p className="mt-8 font-v2-mono text-[12px] uppercase tracking-v2-wide text-white/50">
          Built by AWS-certified engineers · Updated weekly
        </p>
      </div>
    </section>
  )
}
