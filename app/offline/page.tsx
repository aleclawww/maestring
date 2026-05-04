import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { ReloadButton } from './ReloadButton'

export const metadata: Metadata = { title: "You're offline" }

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center"
      style={{
        fontFamily:
          'var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-600">
        <WifiOff className="h-7 w-7" strokeWidth={2} />
      </div>
      <h1 className="mb-2 text-[28px] font-bold tracking-tight text-slate-900">
        You're offline
      </h1>
      <p className="mb-8 max-w-sm text-[14px] leading-[1.6] text-slate-500">
        Check your internet connection and try again. Your study progress is
        saved and will sync when you're back online.
      </p>
      <ReloadButton />
    </div>
  )
}
