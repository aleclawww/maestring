/**
 * Feature deep-dives — alternating image/text rows.
 *
 * TWO features, intentionally. Decided 2026-05-24 after a truth audit cut
 * a third pillar that was either fiction (hands-on labs) or invisible
 * plumbing (FSRS / Coach / concept briefs — real under the hood, not yet
 * feelable in the UI). The arc is two beats: "understand it" via
 * Elaboration Mode, "then prove it" via Mock Exams. A third pillar
 * dilutes the arc. If we later make Coach or briefs feelable end-to-end,
 * they can earn back a spot — same rule as Lifetime.
 *
 * Do NOT re-add aspirational features here. The Hero says the page
 * doesn't let the reader fake-understand; promising a feature that
 * doesn't exist two screens down is the page calling itself a liar.
 */
import { Check, MessageSquareText, Timer } from 'lucide-react'
import { Eyebrow } from '@/components/v2'

interface Feature {
  eyebrow: string
  title: string
  description: string
  bullets: string[]
  Mock: React.ComponentType
}

const FEATURES: Feature[] = [
  {
    eyebrow: 'Elaboration Mode',
    title: 'The moment you find out if you really got it.',
    description:
      "A correct multiple-choice answer tells you whether you recognized — not whether you understood. So Maestring asks you to explain each correct answer back, in your own words, then shows the model side-by-side. No grading, just the truth of what you could and couldn't say. The gap between the two is the work you actually need to do.",
    bullets: [
      'Triggered after every correct answer — opt-in, never forced',
      'Side-by-side: your text vs. the model explanation',
      'Self-assessed checklist of the key points — honor system',
    ],
    Mock: ElaborationMock,
  },
  {
    eyebrow: 'Mock exams',
    title: 'Then sit it under real conditions.',
    description:
      "65 questions, 130 minutes, the exact format you'll see on exam day. After you submit, Maestring shows the domain-by-domain breakdown so you know which concepts to go back and re-explain. Mocks aren't your study tool — they're how you confirm the study worked.",
    bullets: [
      '65 questions in 130 minutes — official AWS format',
      'Flag-for-review and question navigator like the real UI',
      'Domain breakdown points you back to what to re-explain',
    ],
    Mock: ExamMock,
  },
]

const FEATURE_ICONS = [MessageSquareText, Timer]

export function Features() {
  return (
    <section className="border-t border-v2-border-subtle py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        {/*
          Eyebrow + H2 chosen 2026-05-24 to mirror the Hero cadence
          ("recall, not recognize" → "understand, then prove"). The
          previous subhead ("notes, flashcards, study plans are the
          floor") reinforced a "better question bank with extras" frame
          which the Hero now explicitly rejects — cut, not replaced.
          The H2 carries the entire frame; the two feature cards do
          the demonstrating.
        */}
        <div className="max-w-[680px]">
          <Eyebrow>How it works</Eyebrow>
          {/*
            Two nbsps bind the WHOLE second beat together:
              - nbsp between "Then" and "prove" → keeps "Then" with
                the gradient phrase instead of orphaning at line-1 end
              - nbsp between "prove" and "it." → keeps "it." from
                widowing on its own line
            Result at narrow widths: the wrap happens cleanly between
            "Understand it." (line 1) and "Then prove it." (line 2),
            preserving the two-beat read symmetrically.
          */}
          <h2 className="v2-display mt-3 text-[36px] sm:text-[44px] lg:text-[52px]">
            Understand it.{' '}
            <span className="whitespace-nowrap">
              Then <span className="v2-text-gradient">prove it.</span>
            </span>
          </h2>
        </div>

        <div className="mt-16 space-y-24 lg:space-y-32">
          {FEATURES.map((f, i) => {
            const reversed = i % 2 === 1
            const Icon = FEATURE_ICONS[i] as typeof MessageSquareText
            return (
              <div
                key={f.title}
                className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16 ${
                  reversed ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
              >
                {/* Mock */}
                <div className="relative">
                  <div
                    className="rounded-2xl border border-v2-border bg-v2-surface p-6 shadow-v2-elevated"
                    style={{
                      transform: reversed
                        ? 'rotateY(6deg)'
                        : 'rotateY(-6deg)',
                      perspective: '1200px',
                    }}
                  >
                    <f.Mock />
                  </div>
                </div>

                {/* Copy */}
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <p className="mt-5 font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                    {f.eyebrow}
                  </p>
                  <h3 className="v2-display mt-2 text-[30px] sm:text-[36px]">
                    {f.title}
                  </h3>
                  <p className="mt-4 text-[16px] leading-[1.7] text-v2-foreground-muted">
                    {f.description}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {f.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-3 text-[15px] text-v2-foreground"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
                          <Check className="h-3 w-3" strokeWidth={2.75} />
                        </span>
                        <span className="leading-[1.55]">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Stylized mocks (no real screenshots yet) ─────────────────────────

function ExamMock() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-v2-border-subtle pb-3">
        <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          SAA-C03 · Question 12 of 65
        </span>
        <span className="rounded-md bg-v2-warning-soft px-2 py-0.5 font-v2-mono text-[10px] font-semibold text-v2-warning">
          1:24:08
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-v2-surface-sunken">
        <div className="h-2 w-[18%] rounded-full bg-v2-gradient-brand" />
      </div>
      <p className="text-[13px] font-semibold leading-[1.5] text-v2-foreground">
        A company runs an order-processing app on EC2. They want to decouple
        the front end from the worker fleet. Which service fits best?
      </p>
      <div className="space-y-2">
        {['SQS standard queue', 'Kinesis Data Streams', 'EventBridge', 'DynamoDB Streams'].map((t, i) => (
          <div
            key={t}
            className={
              i === 0
                ? 'rounded-lg border border-v2-brand bg-v2-brand-soft px-3 py-2 text-[12px] font-medium text-v2-foreground'
                : 'rounded-lg border border-v2-border bg-v2-surface px-3 py-2 text-[12px] text-v2-foreground-muted'
            }
          >
            <span className="mr-2 font-v2-mono font-semibold">
              {String.fromCharCode(65 + i)}
            </span>
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}

// Visual mock for Elaboration Mode. Renders the actual moment of value:
// the side-by-side reveal after the user clicks "Reveal model". Content
// is taken verbatim from the seeded `security-groups-vs-nacls`
// elaboration so the mock is true to what a paying user actually sees.
// If the seeded elaboration content changes, update here too — the
// landing should never show a model explanation we wouldn't ship.
function ElaborationMock() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-v2-border-subtle pb-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-v2-success-soft px-2 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-success">
          <Check className="h-3 w-3" strokeWidth={3} /> Correct
        </span>
        <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Security Groups vs NACLs
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-v2-border bg-v2-surface-sunken/40 p-3">
          <div className="font-v2-mono text-[9px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            Your words
          </div>
          <p className="mt-2 text-[11px] leading-[1.5] text-v2-foreground">
            SG is on the instance, NACL is on the subnet. SG only allows;
            NACL allows and denies.
          </p>
        </div>
        <div className="rounded-lg border border-v2-brand/30 bg-v2-brand-soft/50 p-3">
          <div className="font-v2-mono text-[9px] uppercase tracking-v2-wide text-v2-brand">
            Model
          </div>
          <p className="mt-2 text-[11px] leading-[1.5] text-v2-foreground">
            Both filter traffic, but at different layers. <span className="font-semibold">Security Group</span> attaches to the ENI and is <span className="font-semibold">stateful</span> — if you let a connection in, the response goes out automatically…
          </p>
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="font-v2-mono text-[9px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Did your explanation cover…
        </div>
        {[
          { label: 'Distinguishes stateful (SG) from stateless (NACL)', done: true },
          { label: 'Places the SG on the instance/ENI and the NACL on the subnet', done: true },
          { label: 'Mentions the return-traffic / ephemeral-ports trap', done: false },
        ].map((s) => (
          <div key={s.label} className="flex items-start gap-2.5">
            <span
              className={
                s.done
                  ? 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-v2-success text-white'
                  : 'mt-0.5 h-4 w-4 shrink-0 rounded border border-v2-border-strong'
              }
            >
              {s.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <span
              className={
                s.done
                  ? 'text-[11px] leading-[1.4] text-v2-foreground'
                  : 'text-[11px] leading-[1.4] text-v2-foreground-muted'
              }
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

