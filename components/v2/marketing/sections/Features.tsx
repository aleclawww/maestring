/**
 * Feature deep-dives — alternating image/text rows.
 *
 * Four features. Direction alternates. Each features a stylized product
 * mock on one side (built from divs, no real screenshots yet) and copy +
 * 3 bullet points on the other.
 */
import { Check, Clock, Server, Brain } from 'lucide-react'
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
    eyebrow: 'Mock exams',
    title: 'Identical to the real AWS exam.',
    description:
      "Same question structure, same timer, same flag-for-review flow. When you sit the official exam, it's the third or fourth time you've seen this UI.",
    bullets: [
      '65 questions in 130 minutes — official format',
      'Domain-by-domain breakdown after each attempt',
      'Question navigator with flag/skip/answered states',
    ],
    Mock: ExamMock,
  },
  {
    eyebrow: 'Hands-on labs',
    title: 'Real labs in your own AWS account.',
    description:
      'Scoped IAM policies provision exactly what each lab needs and tear it down at the end. No surprise bills, no shared sandbox quirks.',
    bullets: [
      'Auto-graded by inspecting your real account state',
      'Cost cap per lab — labs auto-stop before they bite',
      '40+ guided labs covering every exam domain',
    ],
    Mock: LabMock,
  },
  {
    eyebrow: 'Spaced repetition',
    title: 'A schedule that respects your memory.',
    description:
      'FSRS-4.5 surfaces what you almost know just before you would forget it. The same algorithm Anki power-users converged on, tuned for AWS facts.',
    bullets: [
      'Identifies your weak domains automatically',
      'Daily review window adapts to your retention curve',
      'Streak protection if life happens — no shame loops',
    ],
    Mock: ReviewMock,
  },
]

const FEATURE_ICONS = [Clock, Server, Brain]

export function Features() {
  return (
    <section className="border-t border-v2-border-subtle py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-[680px]">
          <Eyebrow>Features</Eyebrow>
          <h2 className="v2-display mt-3 text-[36px] sm:text-[44px] lg:text-[52px]">
            Three things we{' '}
            <span className="v2-text-gradient">obsessed over.</span>
          </h2>
          <p className="mt-5 max-w-[560px] text-[17px] leading-[1.7] text-v2-foreground-muted">
            Everything else (notes, flashcards, study plans) is the floor. The
            three below are why you'd pay for Maestring instead of stitching
            something together yourself.
          </p>
        </div>

        <div className="mt-16 space-y-24 lg:space-y-32">
          {FEATURES.map((f, i) => {
            const reversed = i % 2 === 1
            const Icon = FEATURE_ICONS[i] as typeof Clock
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

function LabMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-v2-success-soft px-2 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-success">
          Lab · Active
        </span>
        <span className="font-v2-mono text-[10px] text-v2-foreground-subtle">
          Cost so far · $0.04
        </span>
      </div>
      <p className="text-[13px] font-bold text-v2-foreground">
        Build a multi-AZ ALB with HTTPS termination
      </p>
      {[
        { label: 'Provision VPC + 2 subnets', done: true },
        { label: 'Create security group for ALB', done: true },
        { label: 'Launch 2× EC2 in different AZs', done: true },
        { label: 'Attach ACM cert + redirect HTTP→HTTPS', done: false },
        { label: 'Verify with curl from your machine', done: false },
      ].map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 rounded-lg border border-v2-border bg-v2-surface px-3 py-2"
        >
          <span
            className={
              s.done
                ? 'flex h-5 w-5 items-center justify-center rounded-full bg-v2-success text-white'
                : 'h-5 w-5 rounded-full border border-v2-border-strong'
            }
          >
            {s.done && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
          <span
            className={
              s.done
                ? 'text-[12px] text-v2-foreground-subtle line-through'
                : 'text-[12px] font-medium text-v2-foreground'
            }
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function ReviewMock() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className="space-y-4">
      <div>
        <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Today's review · 18 cards
        </span>
        <p className="mt-1 text-[13px] font-bold text-v2-foreground">
          Memory schedule
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="text-center">
            <div className="font-v2-mono text-[9px] uppercase text-v2-foreground-subtle">
              {d}
            </div>
            <div
              className={`mt-1 h-10 rounded-md ${
                i < 4
                  ? 'bg-v2-gradient-brand'
                  : i === 4
                  ? 'bg-v2-brand-soft border-2 border-v2-brand'
                  : 'bg-v2-surface-sunken'
              }`}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-2">
        {[
          { domain: 'IAM & Identity', strength: 92 },
          { domain: 'Networking', strength: 71 },
          { domain: 'Storage', strength: 54 },
        ].map((d) => (
          <div key={d.domain}>
            <div className="flex justify-between text-[11px]">
              <span className="font-medium text-v2-foreground">
                {d.domain}
              </span>
              <span className="font-v2-mono text-v2-foreground-muted">
                {d.strength}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-v2-surface-sunken">
              <div
                className="h-full rounded-full bg-v2-gradient-brand"
                style={{ width: `${d.strength}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

