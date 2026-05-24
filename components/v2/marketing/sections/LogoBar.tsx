/**
 * Coverage band — what's actually inside the product.
 *
 * Originally a logo bar with company placeholders. Replaced with verifiable
 * product facts so the band carries weight before any partnerships exist.
 *
 * Rewritten 2026-05-24:
 *   - Was "Six exam-guide domains" with 6 paraphrased categories. SAA-C03
 *     actually has FOUR official domains per the AWS exam guide v1.1,
 *     mirrored in lib/knowledge-graph/aws-saa.ts (Secure 30%, Resilient
 *     26%, Performing 24%, Cost 20%). The 6-category framing
 *     contradicted the StatsBand's "142 concepts / one certification"
 *     reality. Same family as every other fiction cut today.
 *   - "Every certification we ship" → singular. We ship one cert.
 *
 * Each card now shows the official domain name + its exam weight, which
 * matches what a SAA candidate would recognize from the official guide —
 * verifiable in 5 seconds against AWS's own PDF.
 */
const COVERAGE = [
  { name: 'Design Secure Architectures', weight: 30 },
  { name: 'Design Resilient Architectures', weight: 26 },
  { name: 'Design High-Performing Architectures', weight: 24 },
  { name: 'Design Cost-Optimized Architectures', weight: 20 },
]

export function LogoBar() {
  return (
    <section className="border-y border-v2-border bg-v2-surface-subtle">
      <div className="mx-auto max-w-[1200px] px-6 py-12 sm:py-14">
        <p className="text-center font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          The four official SAA-C03 domains, weighted to the exam guide
        </p>

        <div className="mt-7 grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {COVERAGE.map((d) => (
            <div
              key={d.name}
              className="flex h-14 items-center justify-between gap-2 rounded-lg border border-v2-border bg-v2-surface px-4 text-[13px] font-semibold text-v2-foreground-muted transition-colors duration-200 ease-v2 hover:border-v2-brand/30 hover:text-v2-foreground"
            >
              <span className="truncate">{d.name}</span>
              <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                {d.weight}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
