import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Initial setup' }

// The onboarding page renders its own full-bleed v2 background, header,
// and step indicator. This layout is a transparent passthrough — it
// exists only to satisfy the (dashboard) layout's onboarding-flow bypass.
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
