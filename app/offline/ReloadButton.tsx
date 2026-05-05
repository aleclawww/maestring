'use client'

import { RotateCcw } from 'lucide-react'

export function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-[14px] font-semibold text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.30)] transition-all hover:-translate-y-0.5"
    >
      <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
      Try again
    </button>
  )
}
