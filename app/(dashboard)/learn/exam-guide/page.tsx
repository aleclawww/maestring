import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  EXAM_META,
  EXAM_DOMAINS,
  APPENDIX_TECHNOLOGIES_AND_CONCEPTS,
  SERVICES_IN_SCOPE,
  SERVICES_OUT_OF_SCOPE,
} from '@/lib/knowledge-graph/saa-exam-guide'
import { Card, Badge, Eyebrow } from '@/components/v2'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SAA-C03 Exam Guide',
  description:
    'Official AWS Certified Solutions Architect — Associate (SAA-C03) exam guide.',
}

export default function ExamGuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
        Learn
      </Link>

      <header>
        <Badge tone="brand" size="md" mono className="mb-3">
          {EXAM_META.code} · v{EXAM_META.version}
        </Badge>
        <h1 className="v2-display text-[36px] sm:text-[44px]">
          {EXAM_META.title}
        </h1>
        <p className="mt-3 max-w-[640px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          Official exam guide. Covers exam format, scoring, the four content
          domains with their task statements, and the full list of in-scope and
          out-of-scope AWS services.
        </p>
      </header>

      {/* Overview */}
      <section>
        <Eyebrow>Overview</Eyebrow>
        <Card padding="lg" className="mt-3 space-y-5">
          <p className="text-[14px] leading-[1.65] text-v2-foreground">
            The SAA-C03 exam is for individuals who perform a solutions
            architect role. It validates the ability to design solutions based
            on the AWS Well-Architected Framework — secure, resilient,
            high-performing, and cost-optimized.
          </p>

          <div>
            <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
              Recommended experience
            </p>
            <p className="mt-1 text-[14px] leading-[1.6] text-v2-foreground-muted">
              {EXAM_META.recommendedExperience}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Scored questions"
              value={String(EXAM_META.scoredQuestions)}
            />
            <Stat
              label="Unscored (research)"
              value={String(EXAM_META.unscoredQuestions)}
            />
            <Stat
              label="Passing score"
              value={`${EXAM_META.passingScore} / 1000`}
            />
          </div>

          <div>
            <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
              Question formats
            </p>
            <ul className="mt-2 space-y-1.5">
              {EXAM_META.questionTypes.map((q) => (
                <li
                  key={q}
                  className="flex gap-2 text-[14px] text-v2-foreground"
                >
                  <span className="text-v2-brand">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-v2-border-subtle pt-4 text-[12px] leading-[1.6] text-v2-foreground-muted">
            Scoring is compensatory — you don't need to pass each section, only
            the overall exam. Unanswered questions count as wrong (no penalty
            for guessing).
          </div>
        </Card>
      </section>

      {/* Domain breakdown */}
      <section>
        <Eyebrow>Content domains</Eyebrow>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {EXAM_DOMAINS.map((d) => (
            <Card key={d.number} padding="md">
              <p className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Domain {d.number}
              </p>
              <p className="mt-1 text-[14px] font-bold text-v2-foreground">
                {d.title}
              </p>
              <p className="mt-2 font-v2-mono text-[12px] font-semibold text-v2-brand">
                {d.weightPercent}% of scored content
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-8 space-y-10">
          {EXAM_DOMAINS.map((d) => (
            <div key={d.number}>
              <div className="flex items-baseline gap-3 border-b border-v2-border-subtle pb-3">
                <h3 className="text-[18px] font-bold text-v2-foreground">
                  Domain {d.number}: {d.title}
                </h3>
                <Badge tone="brand" size="sm">
                  {d.weightPercent}%
                </Badge>
              </div>

              <div className="mt-5 space-y-4">
                {d.tasks.map((t) => (
                  <Card key={t.id} padding="lg">
                    <p className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                      Task {t.id}
                    </p>
                    <h4 className="mt-1 text-[15px] font-bold text-v2-foreground">
                      {t.title}
                    </h4>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                          Knowledge of
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {t.knowledge.map((k, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-[12px] leading-[1.55] text-v2-foreground-muted"
                            >
                              <span className="shrink-0 text-v2-foreground-subtle">·</span>
                              <span>{k}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-success">
                          Skills in
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {t.skills.map((s, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-[12px] leading-[1.55] text-v2-foreground-muted"
                            >
                              <span className="shrink-0 text-v2-foreground-subtle">·</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Appendix — Tech & concepts */}
      <section>
        <Eyebrow>Appendix · Technologies & concepts</Eyebrow>
        <p className="mt-2 text-[13px] text-v2-foreground-muted">
          High-level themes that may appear on the exam. Order is not
          indicative of weight.
        </p>
        <Card padding="lg" className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {APPENDIX_TECHNOLOGIES_AND_CONCEPTS.map((t) => (
              <Badge key={t} tone="neutral" size="sm">
                {t}
              </Badge>
            ))}
          </div>
        </Card>
      </section>

      {/* Services in scope */}
      <section>
        <Eyebrow>Appendix · Services IN scope</Eyebrow>
        <p className="mt-2 text-[13px] text-v2-foreground-muted">
          AWS services that are fair game on the exam, grouped by category.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {SERVICES_IN_SCOPE.map((c) => (
            <Card key={c.category} padding="md">
              <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                {c.category}
              </p>
              <ul className="mt-2 space-y-1">
                {c.services.map((s) => (
                  <li
                    key={s}
                    className="flex gap-2 text-[12px] leading-[1.5] text-v2-foreground-muted"
                  >
                    <span className="shrink-0 text-v2-foreground-subtle">·</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Services out of scope */}
      <section>
        <Eyebrow>Appendix · Services OUT of scope</Eyebrow>
        <p className="mt-2 text-[13px] text-v2-foreground-muted">
          AWS services that are <strong>not</strong> tested on SAA-C03. Don't
          waste study time here.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {SERVICES_OUT_OF_SCOPE.map((c) => (
            <Card key={c.category} padding="md">
              <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-warning">
                {c.category}
              </p>
              <ul className="mt-2 space-y-1">
                {c.services.map((s) => (
                  <li
                    key={s}
                    className="flex gap-2 text-[12px] leading-[1.5] text-v2-foreground-muted"
                  >
                    <span className="shrink-0 text-v2-foreground-subtle">·</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-v2-border-subtle pt-5 text-[12px] leading-[1.6] text-v2-foreground-subtle">
        Source: AWS Certified Solutions Architect — Associate (SAA-C03) Exam
        Guide v{EXAM_META.version}. Always cross-check against the latest
        version on the official AWS Certification page before sitting the exam.
      </footer>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-v2-border-subtle bg-v2-surface-subtle/60 px-4 py-3">
      <p className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-bold text-v2-foreground">{value}</p>
    </div>
  )
}
