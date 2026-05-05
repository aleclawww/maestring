import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'

// Plus Jakarta Sans — geometric sans-serif with friendly rounded terminals.
// Loaded across the full weight range we use (400 / 500 / 600 / 700 / 800).
export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

// Mono is reserved for cert codes (SAA-C03), step indices, and code blocks.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})
