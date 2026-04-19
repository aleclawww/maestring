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
    default: 'Maestring — Domina AWS con IA y Spaced Repetition',
  },
  description:
    'Prepárate para AWS SAA-C03 con IA adaptativa, spaced repetition FSRS y simulacros reales. Aprueba en menos tiempo con el método más efectivo.',
  keywords: [
    'AWS',
    'SAA-C03',
    'certificación',
    'spaced repetition',
    'FSRS',
    'inteligencia artificial',
    'estudio',
    'preparación',
    'cloud',
  ],
  authors: [{ name: 'Maestring Team' }],
  creator: 'Maestring',
  publisher: 'Maestring',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://maestring.com',
    siteName: 'Maestring',
    title: 'Maestring — Domina AWS con IA y Spaced Repetition',
    description:
      'Prepárate para AWS SAA-C03 con IA adaptativa, spaced repetition FSRS y simulacros reales.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Maestring — Preparación AWS con IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maestring — Domina AWS con IA',
    description: 'Prepárate para AWS SAA-C03 con el método más efectivo: IA + FSRS.',
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
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
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
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <PostHogProvider>
          {children}
          <CookieBanner />
        </PostHogProvider>
      </body>
    </html>
  )
}
