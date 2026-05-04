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

const FAQS: FAQItem[] = [
  {
    q: 'Will it help if I already have cloud experience?',
    a: 'Yes. Most of our students are mid-to-senior engineers who already use AWS daily but need to formalize the knowledge. The adaptive scheduler skips what you already know — you will not waste time on EC2 basics if you have run EC2 in production.',
  },
  {
    q: 'Are the practice exams the official AWS ones?',
    a: 'No. The official exams are not redistributable — anyone selling them is breaking AWS terms. Ours are written by AWS-certified engineers and calibrated against the official exam guide. Format is identical: 65 questions, 130 minutes, same scoring scale.',
  },
  {
    q: 'How long until I can pass SAA-C03?',
    a: 'Depends on your starting point. The first week gives you a calibrated estimate based on a placement test. Most engineers with prior cloud experience land between 4 and 8 weeks at a few hours per week.',
  },
  {
    q: 'Do I get an AWS account for the labs?',
    a: 'You bring your own. We provide IAM policy templates that scope each lab to the bare minimum, and a cost cap that auto-stops the lab before it bites. Total lab cost across the whole SAA course is typically under $5.',
  },
  {
    q: 'What happens if I fail the official exam?',
    a: "You keep your access — Pro is monthly so you can re-prep without buying anything new. The platform highlights the domains that didn't land and reschedules them at the top of the queue.",
  },
  {
    q: 'Is there a student discount?',
    a: 'Yes — 50% off Pro for verified .edu / academic emails. Email students@maestring.com from your university address.',
  },
  {
    q: 'What language is the content in?',
    a: 'English primary, Spanish on the way (Q3 2026). The official AWS exams in Europe are taken in English regardless, so we focus on that as the primary surface.',
  },
  {
    q: 'Can I pause my subscription?',
    a: 'Yes. Pause for up to 90 days from the billing portal — we keep your progress, FSRS state, and streak intact. No fee, no questions.',
  },
]

export function FAQ() {
  return (
    <section className="border-t border-v2-border-subtle py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[820px] px-6">
        <div className="max-w-[680px]">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="v2-display mt-3 text-[36px] sm:text-[44px] lg:text-[52px]">
            What almost everyone asks{' '}
            <span className="v2-text-gradient">before signing up.</span>
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
