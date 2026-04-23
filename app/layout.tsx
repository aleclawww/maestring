import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PostHogProvider } from '@/components/shared/PostHogProvider'
import { CookieBanner } from '@/components/shared/CookieBanner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maestring.com'),
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
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Maestring — AWS prep with AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maestring — Master AWS with AI',
    description: 'Prep for AWS SAA-C03 with the most effective method: AI + FSRS.',
    images: ['/og-image.png'],
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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <PostHogProvider>
          {children}
          <CookieBanner />
        </PostHogProvider>
      </body>
    </html>
  )
}
