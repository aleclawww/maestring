import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PostHogProvider } from '@/components/shared/PostHogProvider'
import { CookieBanner } from '@/components/shared/CookieBanner'
import { ServiceWorkerRegistration } from '@/components/shared/ServiceWorkerRegistration'
import { ExitIntentPopup } from '@/components/shared/ExitIntentPopup'
import { StickySignupBar } from '@/components/shared/StickySignupBar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://maestring.com'),
  // Canonical tells Google which URL is the definitive version of this domain —
  // without it Google may pick an arbitrary indexed URL for favicon association.
  alternates: {
    canonical: '/',
  },
  title: {
    template: '%s | Maestring',
    default: 'Maestring — Master AWS with AI and Spaced Repetition',
  },
  description:
    'Prep for AWS SAA-C03 with adaptive AI, FSRS spaced repetition, and realistic exam simulators. Pass faster with the most effective method.',
  keywords: [
    'AWS',
    'SAA-C03',
    'certification',
    'spaced repetition',
    'FSRS',
    'artificial intelligence',
    'exam prep',
    'study',
    'cloud',
  ],
  authors: [{ name: 'Maestring Team' }],
  creator: 'Maestring',
  publisher: 'Maestring',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://maestring.com',
    siteName: 'Maestring',
    title: 'Maestring — Master AWS with AI and Spaced Repetition',
    description:
      'Prep for AWS SAA-C03 with adaptive AI, FSRS spaced repetition, and realistic exam simulators.',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Maestring — Stop memorizing 1,000 questions. Know when you\'re ready.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maestring — Master AWS with AI',
    description: 'Prep for AWS SAA-C03 with the most effective method: AI + FSRS.',
    images: ['/api/og'],
    creator: '@maestring',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      // SVG first — modern browsers use the scalable version
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      // 48×48 is Google Search's minimum size for displaying a favicon in SERPs
      { url: '/android-chrome-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0f1117',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Maestring',
  url: 'https://maestring.com',
  logo: 'https://maestring.com/android-chrome-512x512.png',
  description:
    'AWS certification prep with adaptive AI questions, FSRS spaced repetition, and realistic exam simulators.',
  sameAs: [],
}

// WebSite schema is the signal Google uses to associate a favicon with a domain.
// Without it, Google relies solely on the <link rel="icon"> tags — this adds a
// second, authoritative signal that explicitly links the logo to the domain URL.
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Maestring',
  url: 'https://maestring.com',
  description:
    'Pass the AWS SAA-C03 exam faster with AI-powered adaptive questions and spaced repetition.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://maestring.com/blog?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <PostHogProvider>
          {children}
          <CookieBanner />
          <ExitIntentPopup />
          <StickySignupBar />
          <ServiceWorkerRegistration />
        </PostHogProvider>
      </body>
    </html>
  )
}
