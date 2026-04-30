import type { Metadata } from 'next'
import { ReloadButton } from './ReloadButton'

export const metadata: Metadata = { title: 'You\'re offline' }

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 text-6xl">📶</div>
      <h1 className="mb-2 text-2xl font-bold text-text-primary">You&apos;re offline</h1>
      <p className="mb-8 max-w-sm text-sm text-text-secondary">
        Check your internet connection and try again. Your study progress is saved and will sync
        when you&apos;re back online.
      </p>
      <ReloadButton />
    </div>
  )
}
