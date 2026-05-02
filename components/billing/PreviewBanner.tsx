import Link from 'next/link'
import { FREE_PREVIEW } from '@/lib/subscription/check'

export function PreviewBanner({
  usage,
}: {
  usage: { questions: number; ambient: number; anchoring: number }
}) {
  // Most relevant counter = the one closest to its cap.
  const ratios = {
    questions: usage.questions / FREE_PREVIEW.questions,
    ambient: usage.ambient / FREE_PREVIEW.ambient,
    anchoring: usage.anchoring / FREE_PREVIEW.anchoring,
  }
  const dominant = (Object.entries(ratios) as Array<[keyof typeof ratios, number]>)
    .sort((a, b) => b[1] - a[1])[0] ?? (['questions', 0] as [keyof typeof ratios, number])
  const dominantKey = dominant[0]
  const dominantUsed = usage[dominantKey]
  const dominantMax = FREE_PREVIEW[dominantKey]
  const dominantPct = Math.min(100, Math.round((dominantUsed / dominantMax) * 100))

  const tone =
    dominantPct >= 80 ? 'border-warning/40 bg-warning/10'
    : dominantPct >= 50 ? 'border-blue-500/40 bg-blue-500/10'
    : 'border-primary/30 bg-primary/5'

  const labels = {
    questions: 'questions',
    ambient: 'ambient cards',
    anchoring: 'anchoring prompts',
  } as const

  return (
    <div className={`mx-4 mt-3 mb-1 rounded-lg border ${tone} px-4 py-2.5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold">Free preview</span>
          <span className="text-text-secondary ml-2 text-xs">
            {dominantUsed}/{dominantMax} {labels[dominantKey]} used · feel the product, then start your 7-day trial
          </span>
        </div>
        <Link
          href="/trial-required"
          className="text-xs font-semibold whitespace-nowrap rounded-lg bg-primary text-white px-3 py-1.5 hover:opacity-90 transition-opacity"
        >
          Start trial →
        </Link>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-text-muted/10 overflow-hidden">
        <div
          className={`h-full transition-all ${dominantPct >= 80 ? 'bg-warning' : dominantPct >= 50 ? 'bg-blue-500' : 'bg-primary'}`}
          style={{ width: `${dominantPct}%` }}
        />
      </div>
    </div>
  )
}
