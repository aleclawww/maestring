/**
 * Marketing landing page — composition of every Step 4 section in order.
 *
 * Order matches the design directive §6:
 *   1. Hero
 *   2. Logo bar
 *   3. Cert grid
 *   4. How it works
 *   5. Feature deep-dives
 *   6. Stats band
 *   7. Pricing
 *   8. Testimonials
 *   9. FAQ
 *  10. Final CTA
 *
 * Nav (top) and Footer (bottom) come from the layout above this file.
 */
import {
  Hero,
  LogoBar,
  CertGrid,
  HowItWorks,
  Features,
  StatsBand,
  Pricing,
  FAQ,
  FinalCTA,
} from '@/components/v2/marketing/sections'

export default function LandingPage() {
  return (
    <>
      <Hero />
      <LogoBar />
      <CertGrid />
      <HowItWorks />
      <Features />
      <StatsBand />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  )
}
