/**
 * Certification grid — six AWS certs as cards.
 *
 * Card structure: AWS service icon cluster (decorative SVG dots, not real
 * service icons — those are trademarked) + cert code mono + cert name +
 * description + meta row + status (active = "View syllabus" link, coming
 * soon = muted card with no link and a Coming-soon pill).
 *
 * Only SAA-C03 is shipped at launch; the other five are placeholders and
 * render as visually-faded "Coming soon" cards so the grid still tells the
 * full roadmap without overpromising.
 */
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { Eyebrow, Card, Badge, Pill } from '@/components/v2'
import { cn } from '@/lib/utils'

interface Cert {
  code: string
  name: string
  description: string
  level: 'Associate' | 'Professional' | 'Specialty'
  hours: string
  hue: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan'
  /** When false, render as a coming-soon placeholder (no link, faded). */
  available: boolean
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
    available: true,
  },
  {
    code: 'DVA-C02',
    name: 'Developer',
    description:
      'Build, deploy and debug cloud-native applications using AWS SDKs.',
    level: 'Associate',
    hours: '~70h study',
    hue: 'violet',
    available: false,
  },
  {
    code: 'SOA-C02',
    name: 'SysOps Administrator',
    description:
      'Operate and monitor AWS workloads — networking, IAM, observability.',
    level: 'Associate',
    hours: '~85h study',
    hue: 'cyan',
    available: false,
  },
  {
    code: 'SAP-C02',
    name: 'Solutions Architect',
    description:
      'The Pro tier — multi-account governance, complex migrations, cost.',
    level: 'Professional',
    hours: '~120h study',
    hue: 'emerald',
    available: false,
  },
  {
    code: 'MLA-C01',
    name: 'Machine Learning Engineer',
    description:
      'SageMaker, Bedrock, and the data pipelines around them.',
    level: 'Associate',
    hours: '~90h study',
    hue: 'amber',
    available: false,
  },
  {
    code: 'ANS-C01',
    name: 'Advanced Networking',
    description:
      'Direct Connect, Transit Gateway, hybrid DNS, complex VPC topologies.',
    level: 'Specialty',
    hours: '~100h study',
    hue: 'rose',
    available: false,
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

function CertCardInner({ cert }: { cert: Cert }) {
  return (
    <Card interactive={cert.available} className="h-full">
      {/* Service icon cluster — 4 decorative dots in cert hue */}
      <div
        className={cn(
          'flex h-12 w-fit items-center gap-1.5 rounded-xl px-3',
          HUE_BG[cert.hue],
          !cert.available && 'opacity-60',
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-sm bg-current opacity-80"
            style={{ opacity: 0.4 + i * 0.2 }}
          />
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide',
              cert.available ? 'text-v2-brand' : 'text-v2-foreground-subtle',
            )}
          >
            {cert.code}
          </span>
          {!cert.available && (
            <Pill tone="neutral" size="md">
              <Clock className="h-3 w-3" strokeWidth={2.25} />
              <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                Coming soon
              </span>
            </Pill>
          )}
        </div>
        <h3
          className={cn(
            'text-[20px] font-bold leading-[1.3]',
            cert.available
              ? 'text-v2-foreground'
              : 'text-v2-foreground-muted',
          )}
        >
          {cert.name}
        </h3>
        <p
          className={cn(
            'text-[14px] leading-[1.6]',
            cert.available
              ? 'text-v2-foreground-muted'
              : 'text-v2-foreground-subtle',
          )}
        >
          {cert.description}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-v2-foreground-subtle">
        <Badge tone="neutral" size="sm">
          {cert.level}
        </Badge>
        <span className="font-v2-mono">{cert.hours}</span>
      </div>

      {cert.available ? (
        <div className="mt-6 flex items-center gap-1.5 text-[14px] font-semibold text-v2-brand">
          Start studying
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-200 ease-v2 group-hover:translate-x-1"
            strokeWidth={2.5}
          />
        </div>
      ) : (
        <div className="mt-6 font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Notify me when ready →
        </div>
      )}
    </Card>
  )
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
            We launch with SAA-C03 — the most popular AWS certification —
            polished end to end. The rest of the catalog is on the roadmap
            and will land cert by cert.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CERTS.map((c) =>
            c.available ? (
              <Link
                key={c.code}
                href="/signup"
                className="group block focus-visible:outline-none"
              >
                <CertCardInner cert={c} />
              </Link>
            ) : (
              <a
                key={c.code}
                href="mailto:hello@maestring.com?subject=Notify%20me%20when%20{code}%20is%20ready"
                className="group block focus-visible:outline-none"
              >
                <CertCardInner cert={c} />
              </a>
            ),
          )}
        </div>
      </div>
    </section>
  )
}
