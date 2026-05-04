/**
 * /preview/landing/certifications/[code] — single cert detail page.
 *
 * For now we render SAA-C03's content for any code (the route is a preview
 * stub). When real cert data ships, this page reads from the knowledge
 * graph (lib/knowledge-graph/aws-saa.ts) keyed by code.
 *
 * Sections in order:
 *   1. Hero — code, name, level, "what you'll learn" intro, sticky purchase
 *   2. Curriculum — 4 modules with lesson counts
 *   3. Sample question — same isometric card we use in the marketing hero
 *   4. Stats — domain coverage breakdown
 *   5. Final CTA reused from landing
 */
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  FileCheck,
  ServerCog,
  Award,
} from 'lucide-react'
import {
  Eyebrow,
  Pill,
  Badge,
  Button,
  Card,
  CardTitle,
  CardDescription,
  BlurBlob,
} from '@/components/v2'
import { FinalCTA } from '@/components/v2/marketing/sections'

export default function CertDetailPage({
  params,
}: {
  params: { code: string }
}) {
  const code = params.code.toUpperCase()
  // SAA-C03 placeholder content for any preview code.
  const cert = {
    code: code === 'SAP-C02' || code === 'ANS-C01' ? code : 'SAA-C03',
    name: 'Solutions Architect',
    level: 'Associate' as const,
    hours: '~80h study',
    description:
      "AWS's most popular certification. Validates your ability to design distributed systems on AWS — choosing the right service, sizing it correctly, and securing it sensibly. Ideal for engineers stepping into Architect or Senior Engineer roles.",
    learn: [
      'Design resilient multi-AZ and multi-region architectures',
      'Pick the right storage class for cost vs. retrieval needs',
      'Secure VPCs end to end with IAM, SGs, NACLs, and PrivateLink',
      'Right-size compute and configure auto-scaling without surprise bills',
    ],
  }

  const modules = [
    {
      title: 'Foundations · IAM, VPC, EC2',
      lessons: 14,
      hours: '~12h',
      description:
        'The non-negotiable substrate. We cover identity, networking, and compute before anything else.',
      Icon: ServerCog,
    },
    {
      title: 'Storage & Databases',
      lessons: 18,
      hours: '~15h',
      description:
        'S3, EBS, EFS, FSx; RDS, DynamoDB, ElastiCache. When to pick which, and the gotchas.',
      Icon: FileCheck,
    },
    {
      title: 'Resilience & Performance',
      lessons: 16,
      hours: '~14h',
      description:
        'Multi-AZ patterns, ELB types, Auto Scaling lifecycles, CloudFront, Route 53 routing policies.',
      Icon: BookOpen,
    },
    {
      title: 'Security, Cost, Migration',
      lessons: 12,
      hours: '~10h',
      description:
        'KMS, Secrets Manager, Cost Explorer, Compute Optimizer, DMS, DataSync. Plus the test-taking strategy.',
      Icon: Award,
    },
  ]

  const domains = [
    { name: 'Resilient architectures', weight: 26 },
    { name: 'High-performing architectures', weight: 24 },
    { name: 'Secure architectures', weight: 30 },
    { name: 'Cost-optimized architectures', weight: 20 },
  ]

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <BlurBlob className="-left-32 -top-32" size={520} opacity={0.22} animated />
        <BlurBlob
          className="-right-40 top-32"
          background="var(--v2-gradient-brand-soft)"
          size={460}
          opacity={0.55}
        />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 pb-16 pt-20 sm:pt-24 lg:pt-28">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            <Link
              href="/preview/landing"
              className="transition-colors hover:text-v2-foreground"
            >
              Maestring
            </Link>
            <span aria-hidden>/</span>
            <Link
              href="/preview/landing/certifications"
              className="transition-colors hover:text-v2-foreground"
            >
              Certifications
            </Link>
            <span aria-hidden>/</span>
            <span className="text-v2-foreground">{cert.code}</span>
          </nav>

          <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
            {/* Title + intro */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-2.5 py-1 font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                  {cert.code}
                </span>
                <Badge tone="neutral" size="md">
                  {cert.level}
                </Badge>
                <Badge tone="neutral" size="md" mono>
                  {cert.hours}
                </Badge>
              </div>

              <h1 className="v2-display mt-6 text-[44px] leading-[1.05] sm:text-[56px] lg:text-[64px]">
                AWS{' '}
                <span className="v2-text-gradient">{cert.name}</span>
              </h1>

              <p className="mt-6 max-w-[600px] text-[17px] leading-[1.7] text-v2-foreground-muted sm:text-[18px]">
                {cert.description}
              </p>

              {/* What you'll learn */}
              <div className="mt-10">
                <p className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                  What you'll learn
                </p>
                <ul className="mt-4 space-y-3">
                  {cert.learn.map((l) => (
                    <li
                      key={l}
                      className="flex items-start gap-3 text-[15px] text-v2-foreground"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
                        <Check className="h-3 w-3" strokeWidth={2.75} />
                      </span>
                      <span className="leading-[1.55]">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sticky purchase card */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Card padding="lg" tone="emphasized">
                <div className="flex items-baseline gap-2">
                  <span className="v2-display text-[40px] leading-none text-v2-foreground">
                    €149
                  </span>
                  <span className="text-[14px] text-v2-foreground-muted">
                    one-time · lifetime access
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-v2-foreground-muted">
                  Or join Pro for €29/month and unlock every cert.
                </p>

                <Button size="lg" className="mt-6 w-full">
                  Buy {cert.code} access
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Button>
                <Button variant="secondary" size="lg" className="mt-2 w-full">
                  Start 7-day free trial
                </Button>

                <ul className="mt-6 space-y-2.5 border-t border-v2-border-subtle pt-5 text-[13px]">
                  {[
                    'Full course + 60 lessons',
                    '300+ exam-style questions',
                    '8 hands-on labs',
                    '4 full-length mock exams',
                  ].map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2.5 text-v2-foreground"
                    >
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-v2-success"
                        strokeWidth={2.75}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── Curriculum ────────────────────────────────────────── */}
      <section className="border-t border-v2-border-subtle bg-v2-surface-subtle py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-[680px]">
            <Eyebrow>Curriculum</Eyebrow>
            <h2 className="v2-display mt-3 text-[36px] sm:text-[44px]">
              Four modules.{' '}
              <span className="v2-text-gradient">Sixty lessons.</span>
            </h2>
            <p className="mt-4 max-w-[560px] text-[16px] leading-[1.7] text-v2-foreground-muted">
              Modules unlock as you earn the underlying concepts. The
              scheduler keeps revisiting earlier ones so they don't decay
              while you climb.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
            {modules.map((m, i) => (
              <Card key={m.title} interactive>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
                    <m.Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                        Module {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                        {m.lessons} lessons · {m.hours}
                      </span>
                    </div>
                    <CardTitle className="mt-2">{m.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {m.description}
                    </CardDescription>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Domain weighting ──────────────────────────────────── */}
      <section className="border-t border-v2-border-subtle py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <Eyebrow>Exam blueprint</Eyebrow>
              <h2 className="v2-display mt-3 text-[36px] sm:text-[40px]">
                How the official exam{' '}
                <span className="v2-text-gradient">weights its domains.</span>
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-v2-foreground-muted">
                Mirrored in our mocks. The mastery heatmap on your dashboard
                uses the same buckets, so you always know where to spend the
                next study session.
              </p>
              <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-v2-surface-subtle px-3 py-1.5">
                <Clock
                  className="h-3.5 w-3.5 text-v2-foreground-muted"
                  strokeWidth={2.25}
                />
                <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-muted">
                  130 min · 65 questions · 100–1000 score
                </span>
              </div>
            </div>

            <div>
              <Card padding="lg">
                <div className="space-y-5">
                  {domains.map((d) => (
                    <div key={d.name}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[15px] font-semibold text-v2-foreground">
                          {d.name}
                        </span>
                        <span className="font-v2-mono text-[13px] font-semibold text-v2-brand">
                          {d.weight}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-v2-surface-sunken">
                        <div
                          className="h-full rounded-full bg-v2-gradient-brand"
                          style={{ width: `${d.weight}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-v2-border-subtle pt-5">
                  <Pill tone="brand" size="md">
                    <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                      Aligned with the 2026 exam guide
                    </span>
                  </Pill>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA reused from landing */}
      <FinalCTA />
    </>
  )
}
