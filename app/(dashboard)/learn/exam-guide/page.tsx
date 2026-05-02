import Link from 'next/link'
import {
  EXAM_META,
  EXAM_DOMAINS,
  APPENDIX_TECHNOLOGIES_AND_CONCEPTS,
  SERVICES_IN_SCOPE,
  SERVICES_OUT_OF_SCOPE,
} from '@/lib/knowledge-graph/saa-exam-guide'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SAA-C03 Exam Guide',
  description: 'Official AWS Certified Solutions Architect — Associate (SAA-C03) exam guide.',
}

export default function ExamGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/learn" className="text-sm text-text-secondary hover:underline">← Learn</Link>

      <header className="mt-6 mb-10">
        <Badge variant="info" className="mb-3">{EXAM_META.code} · v{EXAM_META.version}</Badge>
        <h1 className="text-3xl font-bold">{EXAM_META.title}</h1>
        <p className="text-text-secondary mt-2">
          Official exam guide. Covers exam format, scoring, the four content domains
          with their task statements, and the full list of in-scope and out-of-scope
          AWS services.
        </p>
      </header>

      {/* OVERVIEW */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm">
              The SAA-C03 exam is for individuals who perform a solutions architect role.
              It validates the ability to design solutions based on the AWS Well-Architected
              Framework — secure, resilient, high-performing, and cost-optimized.
            </p>

            <div>
              <p className="text-xs font-semibold uppercase text-text-secondary mb-1">Recommended experience</p>
              <p className="text-sm">{EXAM_META.recommendedExperience}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <Stat label="Scored questions" value={String(EXAM_META.scoredQuestions)} />
              <Stat label="Unscored (research)" value={String(EXAM_META.unscoredQuestions)} />
              <Stat label="Passing score" value={`${EXAM_META.passingScore} / 1000`} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-text-secondary mb-2">Question formats</p>
              <ul className="text-sm space-y-1">
                {EXAM_META.questionTypes.map(q => (
                  <li key={q} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-border text-xs text-text-secondary">
              Scoring is compensatory — you don&rsquo;t need to pass each section, only the overall exam.
              Unanswered questions count as wrong (no penalty for guessing).
            </div>
          </CardContent>
        </Card>
      </section>

      {/* DOMAIN BREAKDOWN */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Content Domains</h2>
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {EXAM_DOMAINS.map(d => (
            <Card key={d.number}>
              <CardContent className="p-4">
                <p className="text-xs text-text-secondary">Domain {d.number}</p>
                <p className="font-semibold text-sm mt-1">{d.title}</p>
                <p className="text-xs text-primary mt-2 font-semibold">{d.weightPercent}% of scored content</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {EXAM_DOMAINS.map(d => (
          <div key={d.number} className="mb-10">
            <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-border">
              <h3 className="text-lg font-bold">Domain {d.number}: {d.title}</h3>
              <Badge variant="outline">{d.weightPercent}%</Badge>
            </div>

            <div className="space-y-5">
              {d.tasks.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-5">
                    <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Task {t.id}</p>
                    <h4 className="font-semibold mb-4">{t.title}</h4>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <p className="text-xs font-semibold uppercase text-primary mb-2">Knowledge of</p>
                        <ul className="text-xs space-y-1.5">
                          {t.knowledge.map((k, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-text-secondary shrink-0">·</span>
                              <span>{k}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-success mb-2">Skills in</p>
                        <ul className="text-xs space-y-1.5">
                          {t.skills.map((s, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-text-secondary shrink-0">·</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* APPENDIX — Technologies and concepts */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Appendix — Technologies and Concepts</h2>
        <p className="text-sm text-text-secondary mb-4">
          High-level themes that may appear on the exam. Order is not indicative of weight.
        </p>
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-2">
              {APPENDIX_TECHNOLOGIES_AND_CONCEPTS.map(t => (
                <Badge key={t} variant="outline">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* APPENDIX — Services in scope */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Appendix — AWS Services and Features IN Scope</h2>
        <p className="text-sm text-text-secondary mb-4">
          AWS services that are fair game on the exam, grouped by category.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {SERVICES_IN_SCOPE.map(c => (
            <Card key={c.category}>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-primary mb-2">{c.category}</p>
                <ul className="text-xs space-y-1">
                  {c.services.map(s => (
                    <li key={s} className="flex gap-2">
                      <span className="text-text-secondary shrink-0">·</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* APPENDIX — Services out of scope */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Appendix — AWS Services and Features OUT of Scope</h2>
        <p className="text-sm text-text-secondary mb-4">
          AWS services that are <strong>not</strong> tested on SAA-C03. Don&rsquo;t waste study time here.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {SERVICES_OUT_OF_SCOPE.map(c => (
            <Card key={c.category}>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-warning mb-2">{c.category}</p>
                <ul className="text-xs space-y-1">
                  {c.services.map(s => (
                    <li key={s} className="flex gap-2">
                      <span className="text-text-secondary shrink-0">·</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="text-xs text-text-secondary border-t border-border pt-4">
        Source: AWS Certified Solutions Architect — Associate (SAA-C03) Exam Guide v{EXAM_META.version}.
        Always cross-check against the latest version on the official AWS Certification page before sitting the exam.
      </footer>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface/50 px-4 py-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  )
}
