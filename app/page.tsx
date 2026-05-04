import type { Metadata } from 'next'
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
import { Nav, Footer } from '@/components/v2/marketing'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Maestring — Pass your AWS exam first try',
  description:
    'The serious AWS prep platform. Adaptive AI questions, exam-grade simulators, and FSRS spaced repetition. Cover SAA, DVA, SAP and SOA with one workflow.',
  alternates: { canonical: 'https://maestring.com' },
  openGraph: {
    url: 'https://maestring.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function LandingPage() {
  return (
    <div className="theme-v2">
      <Nav />
      <main>
        <Hero />
        <LogoBar />
        <CertGrid />
        <HowItWorks />
        <Features />
        <StatsBand />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
