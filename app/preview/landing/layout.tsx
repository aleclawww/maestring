/**
 * Marketing layout shared by the landing, pricing, certifications, and
 * any other public-facing v2 page. Provides the sticky nav at the top
 * and the canonical footer at the bottom.
 */
import { Nav, Footer } from '@/components/v2/marketing'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
