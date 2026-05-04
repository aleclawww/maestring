/**
 * Marketing footer.
 *
 * Layout: a wide brand column on the left + 4 link columns + a bottom legal
 * row. The brand column carries the wordmark, a tagline, and a status pill
 * ("All systems operational" / link to status page).
 *
 * Tone: subdued — the footer is structural, not promotional. The brand
 * gradient is allowed only on the wordmark dot and the social-icon hover.
 */
import Link from 'next/link'
import { Github, Linkedin, Twitter, Youtube } from 'lucide-react'
import { Logo } from '@/components/v2'

const COLUMNS: Array<{
  heading: string
  links: Array<{ label: string; href: string }>
}> = [
  {
    heading: 'Product',
    links: [
      { label: 'Certifications', href: '/certifications' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'For teams', href: '/teams' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Study guides', href: '/blog' },
      { label: 'Practice exams', href: '/exams' },
      { label: 'Community', href: '/community' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Customers', href: '/customers' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Cookies', href: '/legal/cookies' },
      { label: 'Security', href: '/legal/security' },
    ],
  },
]

const SOCIAL: Array<{
  Icon: typeof Github
  href: string
  label: string
}> = [
  { Icon: Github, href: 'https://github.com', label: 'GitHub' },
  { Icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { Icon: Twitter, href: 'https://twitter.com', label: 'X / Twitter' },
  { Icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
]

export function Footer() {
  return (
    <footer className="border-t border-v2-border bg-v2-surface-subtle">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          {/* Brand column — spans 2 cols on md+ */}
          <div className="col-span-2 md:col-span-2">
            <Logo size={22} />
            <p className="mt-5 max-w-[280px] text-[14px] leading-[1.6] text-v2-foreground-muted">
              The serious AWS prep platform. Adaptive AI, real exam simulators,
              spaced repetition that actually works.
            </p>

            {/* Status pill */}
            <Link
              href="https://status.maestring.com"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-v2-border bg-v2-surface px-3 py-1.5 text-[12px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-v2-success/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-v2-success" />
              </span>
              All systems operational
            </Link>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-v2-foreground-muted transition-colors hover:text-v2-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-v2-border pt-8 sm:flex-row sm:items-center">
          <p className="text-[13px] text-v2-foreground-subtle">
            © {new Date().getFullYear()} Maestring. Independent of and not endorsed
            by Amazon Web Services.
          </p>

          <div className="flex items-center gap-1">
            {SOCIAL.map(({ Icon, href, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-v2-foreground-subtle transition-colors hover:bg-v2-surface hover:text-v2-brand"
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
