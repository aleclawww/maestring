/**
 * Legal pages layout (Terms, Privacy).
 *
 * Rewritten 2026-05-24. Previously hardcoded `bg-[#0f1117] text-white` +
 * `prose-invert` — the dark theme from before the v2 redesign. A reader
 * who clicked "Terms" from the rewriteado footer landed on a page that
 * looked like a different product, which leaks "they didn't finish the
 * rewrite" — the exact signal we worked all day to scrub everywhere
 * else.
 *
 * Now wraps with the shared v2 marketing chrome:
 *   - `theme-v2` class so v2 design tokens (--v2-foreground, surfaces,
 *     etc.) apply throughout
 *   - `<Nav />` from `@/components/v2/marketing` — same nav as landing
 *     and /pricing
 *   - `<Footer />` from `@/components/v2/marketing` — inherits the
 *     SAME cleaned footer just shipped (5 links, mailto contact,
 *     "AWS SAA-C03 prep, covered properly." tagline). Single source of
 *     truth, so legal pages can't drift back to an old footer state.
 *
 * Typography: switched from `prose-invert prose-zinc` to `prose
 * prose-zinc` (light theme equivalent) so the legal pages' raw <h1>/
 * <h2>/<p> markup renders cleanly without each page needing per-element
 * className changes.
 */
import type { ReactNode } from 'react'
import { Nav, Footer } from '@/components/v2/marketing'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-v2 min-h-screen bg-v2-background text-v2-foreground">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16 prose prose-zinc">
        {children}
      </main>
      <Footer />
    </div>
  )
}
