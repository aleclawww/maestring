/**
 * FAQ — accordion using native <details>/<summary>.
 *
 * Why native: zero JS, accessible by default, prefers-reduced-motion
 * works for free. Chevron rotates 180° on open via the [open] selector.
 */
import { ChevronDown } from 'lucide-react'
import { Eyebrow } from '@/components/v2'

interface FAQItem {
  q: string
  a: string
}

/*
 * Rewritten 2026-05-24 after a truth audit. Cuts and rewrites by entry:
 *
 *   #1 Cloud experience → REWRITTEN: removed "Most of our students are
 *      mid-to-senior engineers" — fabricated population claim. With ~2
 *      real users, there is no "most." Substance about adaptive
 *      scheduling kept.
 *
 *   #2 Practice exams → REWRITTEN: dropped "written by AWS-certified
 *      engineerS" plural. Solo author. The honest version leans on
 *      process ("written and reviewed against the official exam
 *      guide") rather than credentials, which skeptical engineers
 *      trust more anyway. If founder wants singular-credential ("an
 *      AWS-certified engineer") instead, swap the second sentence.
 *
 *   #3 How long → REWRITTEN: "Most engineers land in 4-8 weeks" was
 *      a fabricated outcome statistic. Reframed as industry estimate
 *      (~80h) which is true today, with the calibration step described
 *      as what Maestring does to sharpen that estimate per user.
 *
 *   #4 AWS labs → CUT. Labs do not exist in the product. The original
 *      FAQ entry promised IAM scaffolding, cost caps, "under $5 total"
 *      — fiction. Same landmine cut from Features and StatsBand.
 *
 *   #5 Fail official exam → TRIMMED. First half ("Pro is monthly, you
 *      keep access") is true; second half ("platform highlights domains
 *      that didn't land and reschedules them at the top of the queue")
 *      is product fiction — /api/profile/exam-outcome only persists the
 *      outcome, no weak-domain reorganization exists.
 *
 *   #6 Student discount → CUT. students@maestring.com appeared in this
 *      file only — no handler, no policy, no verification flow. A
 *      discount to a dead address breaks the moment someone uses it.
 *      If a real manual process is set up later, restore as:
 *      "Email me .edu proof and I'll set it up manually."
 *
 *   #7 Language → CUT date commitment. No i18n framework exists.
 *      "Spanish on the way (Q3 2026)" was aspiration with a calendar
 *      attached. English-only honest version.
 *
 *   #8 Pause subscription → CUT. Webhook event `subscription_paused`
 *      is in the type union of lib/lemonsqueezy/webhooks.ts but no
 *      handler exists for it — meaning the FAQ's promises ("we keep
 *      your progress, FSRS state, and streak intact") are unimplemented
 *      behaviors. The only honest version was hedged enough to not
 *      belong in a confidence-building FAQ. If users need to pause,
 *      they can email — the "Something else on your mind?" line below
 *      catches it.
 *
 * Rule going forward: every answer here describes something true today.
 * Adding entries requires the same audit. Anything aspirational gets
 * its own roadmap mention, not a FAQ answer.
 */
const FAQS: FAQItem[] = [
  {
    q: 'Will it help if I already have cloud experience?',
    a: "Yes — likely more than if you didn't. Maestring calibrates to your starting point on day one and skips what you already know, so the time you spend is on what you'd actually fail in the exam. If you've run EC2 in production, you won't be drilling EC2 basics.",
  },
  {
    q: 'Are the practice exams the official AWS ones?',
    a: "No — the official exams aren't redistributable, and anyone selling them is breaking AWS terms. Maestring's pool is written and reviewed against the official SAA-C03 exam guide. Format is identical to the real exam: 65 questions, 130 minutes, same scoring scale.",
  },
  {
    q: 'How long until I can pass SAA-C03?',
    a: 'For someone with prior cloud experience, the common estimate is around 80 hours of focused study — roughly 4–8 weeks at a few hours per week, or a couple of months at a slower pace. Maestring calibrates to your starting point on day one and schedules from there, so the estimate sharpens as you go.',
  },
  {
    q: 'What happens if I fail the official exam?',
    a: 'You keep your access — Pro is monthly, so you can re-prep without buying anything new.',
  },
  {
    q: 'What language is the content in?',
    a: "English only for now. The official AWS exams in Europe are taken in English regardless, so that's the primary surface.",
  },
]

export function FAQ() {
  return (
    <section className="border-t border-v2-border-subtle py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[820px] px-6">
        <div className="max-w-[680px]">
          <Eyebrow>Questions</Eyebrow>
          {/*
            H2 rewritten 2026-05-24 — previous "What almost everyone
            asks" implied volume of askers (population claim, same
            family as "most of our students" / "3,200+ engineers"
            cut elsewhere). Replaced with a minimal frame that lets
            the questions themselves carry the section. The "honestly"
            close earns its place because the entries below are
            actually honest — no announcement that isn't demonstrated
            by the next 5 answers.
          */}
          <h2 className="v2-display mt-3 text-[36px] sm:text-[44px] lg:text-[52px]">
            Before you sign up,{' '}
            <span className="v2-text-gradient">answered honestly.</span>
          </h2>
        </div>

        <div className="mt-12 divide-y divide-v2-border-subtle border-y border-v2-border-subtle">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group/faq py-1"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left transition-colors hover:text-v2-brand">
                <span className="text-[16px] font-semibold text-v2-foreground transition-colors group-hover/faq:text-v2-brand sm:text-[17px]">
                  {f.q}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-v2-border bg-v2-surface text-v2-foreground-muted transition-all duration-200 ease-v2 group-open/faq:rotate-180 group-open/faq:border-v2-brand group-open/faq:bg-v2-brand-soft group-open/faq:text-v2-brand">
                  <ChevronDown className="h-4 w-4" strokeWidth={2.25} />
                </span>
              </summary>
              <div className="pb-6 pr-12 text-[15px] leading-[1.7] text-v2-foreground-muted">
                {f.a}
              </div>
            </details>
          ))}
        </div>

        <p className="mt-12 text-center text-[14px] text-v2-foreground-muted">
          Something else on your mind?{' '}
          <a
            href="mailto:hello@maestring.com"
            className="font-semibold text-v2-brand hover:text-v2-brand-hover"
          >
            hello@maestring.com
          </a>
        </p>
      </div>
    </section>
  )
}
