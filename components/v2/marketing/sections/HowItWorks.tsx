/**
 * "Three phases. Zero filler." section.
 *
 * Three columns connected by a thin dashed line on desktop. Big mono numbers
 * in brand color, then title, description, and a small mock screenshot of
 * the feature in question.
 */
import { Eyebrow } from '@/components/v2'
import {
  Compass,
  MessageSquareText,
  Timer,
  type LucideIcon,
} from 'lucide-react'

/*
 * Phases rewritten 2026-05-24 — previously generic Learn / Practice /
 * Certify with copy that hid the wedge: "Learn" promised "real
 * diagrams" (fiction — concept pages render keyFacts text, zero
 * diagrams), "Practice" described adaptive scheduling in language any
 * competitor could sign, "Certify" promised "above 800 means you are
 * ready" as if it were Maestring calibration (it's industry rule of
 * thumb) and closed on "with confidence" (outcome-promise family the
 * Hero rejected). And — the deepest fix — the three-step structure
 * was protecting a fiction: "Learn" needed puffy copy because the
 * box itself described a product not built.
 *
 * The new structure is the actual user journey, audited end-to-end:
 *   01 Calibrate — placement test (real, /learn/calibration)
 *   02 Study with Elaboration — the wedge, named (real, post-correct
 *      panel verified in dogfood 2026-05-24)
 *   03 Sit mocks — mock exam validation (real, wired E2E)
 * Calibrate alone and Mocks alone are category-standard, but the
 * SEQUENCE — and especially Phase 02 named explicitly — is what only
 * Maestring can sign. Icons for 02 + 03 mirror Features for the same
 * product moments (MessageSquareText, Timer); 01 uses Compass.
 */
const PHASES = [
  {
    n: '01',
    title: 'Calibrate',
    desc: "A short placement maps where you actually stand — which AWS concepts you know cold, which you half-remember, which you've never touched. Nothing else starts until that's clear.",
    Icon: Compass,
  },
  {
    n: '02',
    title: 'Study with Elaboration',
    desc: "Questions in the official exam format. When you answer correctly, you explain it back in your own words — then the model appears side-by-side. Recognizing isn't understanding; the gap is where the work happens.",
    Icon: MessageSquareText,
  },
  {
    n: '03',
    title: 'Sit mocks',
    desc: 'Full-format mock exams under real conditions: 65 questions, 130 minutes, same scoring scale. The widely-used readiness benchmark is consistently scoring above 800 of 1000. When you’re there, you book the official exam.',
    Icon: Timer,
  },
]

export function HowItWorks() {
  return (
    <section className="border-t border-v2-border-subtle bg-v2-surface-subtle py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-[680px]">
          <Eyebrow>Method</Eyebrow>
          <h2 className="v2-display mt-3 text-[36px] sm:text-[44px] lg:text-[52px]">
            Three phases.{' '}
            <span className="v2-text-gradient">Zero filler.</span>
          </h2>
          {/*
            Subhead — "and labs" cut (4th and final labs surface today;
            after this, labs is dead on every page). Rest left intact:
            FSRS-4.5 / retrieval practice / interleaving are concrete,
            verifiable methods and naming them earns credibility with
            technical readers who recognize them. Question pool count
            is verified separately on the StatsBand.
          */}
          <p className="mt-5 max-w-[560px] text-[17px] leading-[1.7] text-v2-foreground-muted">
            We borrow the best ideas from cognitive science — FSRS-4.5,
            retrieval practice, interleaving — and pair them with an
            AWS-specific question pool.
          </p>
        </div>

        {/* Connecting dashed line */}
        <div className="relative mt-16">
          <div
            aria-hidden
            className="absolute left-[8%] right-[8%] top-9 hidden h-px lg:block"
            style={{
              background:
                'repeating-linear-gradient(to right, var(--v2-border-strong) 0 6px, transparent 6px 14px)',
            }}
          />

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8">
            {PHASES.map((p) => (
              <div
                key={p.n}
                className="relative flex flex-col items-start gap-4 rounded-xl border border-v2-border bg-v2-surface p-7 shadow-v2-soft"
              >
                {/* Number badge */}
                <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-v2-gradient-brand text-[26px] font-extrabold text-white shadow-v2-button">
                  <span className="font-v2-mono">{p.n}</span>
                </div>

                <div className="mt-2">
                  <h3 className="text-[24px] font-bold tracking-v2-tight text-v2-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-v2-foreground-muted">
                    {p.desc}
                  </p>
                </div>

                {/* Mini visualization */}
                <PhaseMini Icon={p.Icon} idx={p.n} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PhaseMini({
  Icon,
  idx,
}: {
  Icon: LucideIcon
  idx: string
}) {
  return (
    <div className="mt-2 w-full overflow-hidden rounded-lg border border-v2-border bg-v2-surface-subtle p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-v2-brand-soft text-v2-brand">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className="h-2 w-3/4 rounded-full bg-v2-border-strong" />
          <div className="mt-1.5 h-2 w-1/2 rounded-full bg-v2-border" />
        </div>
        <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          {idx}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < (idx === '01' ? 3 : idx === '02' ? 5 : 7)
                ? 'bg-v2-gradient-brand'
                : 'bg-v2-border'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
