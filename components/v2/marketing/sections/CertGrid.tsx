/**
 * Certification grid — six AWS certs as cards.
 *
 * Card structure: AWS service icon cluster (decorative SVG dots, not real
 * service icons — those are trademarked) + cert code mono + cert name +
 * description + meta row + "View syllabus →" link with arrow that translates
 * 4px right on hover (Corporate Trust micro-interaction).
 */
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Eyebrow, Card, Badge } from '@/components/v2'

interface Cert {
  code: string
  name: string
  description: string
  level: 'Associate' | 'Professional' | 'Specialty'
  hours: string
  hue: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan'
}

const CERTS: Cert[] = [
  {
    code: 'SAA-C03',
    name: 'Solutions Architect',
    description:
      'Design distributed systems on AWS. The most popular AWS certification.',
    level: 'Associate',
    hours: '~80h study',
    hue: 'indigo',
  },
  {
    code: 'DVA-C02',
    name: 'Developer',
    description:
      'Build, deploy and debug cloud-native applications using AWS SDKs.',
    level: 'Associate',
    hours: '~70h study',
    hue: 'violet',
  },
  {
    code: 'SOA-C02',
    name: 'SysOps Administrator',
    description:
      'Operate and monitor AWS workloads — networking, IAM, observability.',
    level: 'Associate',
    hours: '~85h study',
    hue: 'cyan',
  },
  {
    code: 'SAP-C02',
    name: 'Solutions Architect',
    description:
      'The Pro tier — multi-account governance, complex migrations, cost.',
    level: 'Professional',
    hours: '~120h study',
    hue: 'emerald',
  },
  {
    code: 'MLA-C01',
    name: 'Machine Learning Engineer',
    description:
      'SageMaker, Bedrock, and the data pipelines around them.',
    level: 'Associate',
    hours: '~90h study',
    hue: 'amber',
  },
  {
    code: 'ANS-C01',
    name: 'Advanced Networking',
    description:
      'Direct Connect, Transit Gateway, hybrid DNS, complex VPC topologies.',
    level: 'Specialty',
    hours: '~100h study',
    hue: 'rose',
  },
]

const HUE_BG: Record<Cert['hue'], string> = {
  indigo: 'bg-v2-brand-soft text-v2-brand',
  violet: 'bg-v2-accent-soft-2 text-v2-accent',
  emerald: 'bg-v2-success-soft text-v2-success',
  amber: 'bg-v2-warning-soft text-v2-warning',
  rose: 'bg-v2-error-soft text-v2-error',
  cyan: 'bg-cyan-50 text-cyan-700',
}

export function CertGrid() {
  return (
    <section className="border-t border-v2-border-subtle py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-[680px]">
          <Eyebrow>Catalog</Eyebrow>
          <h2 className="v2-display mt-3 text-[36px] sm:text-[44px] lg:text-[52px]">
            The certifications that{' '}
            <span className="v2-text-gradient">move your career.</span>
          </h2>
          <p className="mt-5 max-w-[560px] text-[17px] leading-[1.7] text-v2-foreground-muted">
            From Associate through Specialty. 1,800+ exam-style questions,
            hands-on labs in your own AWS account, syllabi aligned with the
            official 2026 guides.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CERTS.map((c) => (
            <Link
              key={c.code}
              href={`/certifications/${c.code.toLowerCase()}`}
              className="group block focus-visible:outline-none"
            >
              <Card interactive className="h-full">
                {/* Service icon cluster — 4 decorative dots in cert hue */}
                <div className={`flex h-12 w-fit items-center gap-1.5 rounded-xl px-3 ${HUE_BG[c.hue]}`}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-sm bg-current opacity-80"
                      style={{ opacity: 0.4 + i * 0.2 }}
                    />
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  <span className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                    {c.code}
                  </span>
                  <h3 className="text-[20px] font-bold leading-[1.3] text-v2-foreground">
                    {c.name}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-v2-foreground-muted">
                    {c.description}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-v2-foreground-subtle">
                  <Badge tone="neutral" size="sm">
                    {c.level}
                  </Badge>
                  <span className="font-v2-mono">{c.hours}</span>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-[14px] font-semibold text-v2-brand">
                  View syllabus
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-200 ease-v2 group-hover:translate-x-1"
                    strokeWidth={2.5}
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
