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
import { Logo } from '@/components/v2'

/*
 * Footer trimmed 2026-05-24 from 16 link entries + 4 social icons + 1
 * status pill down to what actually resolves today. 11 of the 16 links
 * pointed at pages that don't exist (Certifications, For teams,
 * Changelog, Practice exams, Community, About, Customers, Careers,
 * Cookies, Security, plus /contact which is now mailto). Same rule as
 * everywhere else today: a link to a missing page is a missing feature
 * with a different costume. Footer with 5 honest entries beats footer
 * with 16 where 11 reveal "template not finished" to a curious clicker.
 *
 * Social icons pointed at github.com / linkedin.com / twitter.com /
 * youtube.com root URLs — generic homepages, not real Maestring
 * profiles. Cut. When real profiles exist, restore individually.
 *
 * Status pill pointed at https://status.maestring.com and rendered a
 * hardcoded "All systems operational" pulse with zero monitoring
 * backend. Same family as the TopBar's phantom unread-notifications
 * dot — a visual claim about system state with no source of truth.
 * Cut.
 *
 * Contact link converted to mailto (was /contact 404). Matches the
 * pattern used by CertGrid's roadmap rows.
 */
const COLUMNS: Array<{
  heading: string
  links: Array<{ label: string; href: string }>
}> = [
  {
    heading: 'Product',
    links: [{ label: 'Pricing', href: '/pricing' }],
  },
  {
    heading: 'Resources',
    links: [{ label: 'Blog', href: '/blog' }],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Contact', href: 'mailto:hello@maestring.com' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-v2-border bg-v2-surface-subtle">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          {/* Brand column — spans 2 cols on md+.
              Status pill removed 2026-05-24 — was a hardcoded "All
              systems operational" pulse with no monitoring backend.
              Brand tagline rewritten the same day. Previous read
              "Adaptive AI, real exam simulators, spaced repetition
              that actually works" — three buzzwords the Hero
              explicitly rejected (commodity "Adaptive AI", plural
              simulators when one exists, FSRS-feels-invisible).
              Replaced with the signature phrase already used in
              StatsBand ("...covered properly") so footer + band
              repeat the same line and make it the recognizable
              product lema across surfaces. The footer is closer
              (lowest-attention slot), not pitch — mechanism is
              upstream, this just signs off in the voice. */}
          <div className="col-span-2 md:col-span-2">
            <Logo size={22} />
            <p className="mt-5 max-w-[280px] text-[14px] leading-[1.6] text-v2-foreground-muted">
              AWS SAA-C03 prep, covered properly.
            </p>
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

        {/* Bottom row — social icon strip removed 2026-05-24 (generic
            github.com / linkedin.com / twitter.com / youtube.com roots,
            no real Maestring profiles existed). Restore individually
            when accounts are live. */}
        <div className="mt-16 border-t border-v2-border pt-8">
          <p className="text-[13px] text-v2-foreground-subtle">
            © {new Date().getFullYear()} Maestring. Independent of and not endorsed
            by Amazon Web Services.
          </p>
        </div>
      </div>
    </footer>
  )
}
