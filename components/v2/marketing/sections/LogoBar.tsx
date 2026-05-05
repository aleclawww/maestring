/**
 * Coverage band — what's actually inside the product.
 *
 * Originally a logo bar with company placeholders. Replaced with verifiable
 * product facts (exam domains and topics we cover) so the band carries
 * weight before any partnerships exist. Same surface-subtle break between
 * hero and the rest of the page.
 */
const COVERAGE = [
  'Compute & Networking',
  'Storage & Databases',
  'Security & IAM',
  'Resilience & DR',
  'Cost Optimization',
  'Migration & Hybrid',
]

export function LogoBar() {
  return (
    <section className="border-y border-v2-border bg-v2-surface-subtle">
      <div className="mx-auto max-w-[1200px] px-6 py-12 sm:py-14">
        <p className="text-center font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Six exam-guide domains, every certification we ship
        </p>

        <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
          {COVERAGE.map((c) => (
            <div
              key={c}
              className="flex h-12 items-center justify-center rounded-lg border border-v2-border bg-v2-surface px-3 text-center text-[13px] font-semibold text-v2-foreground-muted transition-colors duration-200 ease-v2 hover:border-v2-brand/30 hover:text-v2-foreground"
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
