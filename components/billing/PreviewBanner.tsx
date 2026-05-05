'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { FREE_PREVIEW } from '@/lib/subscription/check'
import { track } from '@/lib/analytics'

export function PreviewBanner({
  usage,
}: {
  usage: { questions: number; ambient: number; anchoring: number }
}) {
  const ratios = {
    questions: usage.questions / FREE_PREVIEW.questions,
    ambient: usage.ambient / FREE_PREVIEW.ambient,
    anchoring: usage.anchoring / FREE_PREVIEW.anchoring,
  }
  const dominant =
    (Object.entries(ratios) as Array<[keyof typeof ratios, number]>).sort(
      (a, b) => b[1] - a[1],
    )[0] ?? (['questions', 0] as [keyof typeof ratios, number])
  const dominantKey = dominant[0]
  const dominantRatio = dominant[1]
  const dominantUsed = usage[dominantKey]
  const dominantMax = FREE_PREVIEW[dominantKey]
  const dominantPct = Math.min(
    100,
    Math.round((dominantUsed / dominantMax) * 100),
  )

  // Banner re-mounts on layout navigation (server component re-renders the
  // (dashboard) layout per request), so impression fires once per mount.
  // If `usage` ever updates in-place without remount, this guard suppresses
  // subsequent dimension changes — revisit then.
  const impressionFired = useRef(false)
  useEffect(() => {
    if (impressionFired.current) return
    impressionFired.current = true
    track({
      name: 'preview_banner_impression',
      properties: {
        dimension: dominantKey,
        ratio: dominantRatio,
        used: dominantUsed,
        max: dominantMax,
      },
    })
  }, [])

  const toneBg =
    dominantPct >= 80
      ? 'border-v2-warning/40 bg-v2-warning-soft'
      : dominantPct >= 50
        ? 'border-sky-500/30 bg-sky-50'
        : 'border-v2-brand/30 bg-v2-brand-soft'

  const barTone =
    dominantPct >= 80
      ? 'bg-v2-warning'
      : dominantPct >= 50
        ? 'bg-sky-500'
        : 'bg-v2-gradient-brand'

  const labels = {
    questions: 'questions',
    ambient: 'ambient cards',
    anchoring: 'anchoring prompts',
  } as const

  return (
    <div className={`mx-4 my-2 rounded-lg border px-4 py-2.5 ${toneBg}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-[13px] text-v2-foreground">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0 text-v2-brand"
            strokeWidth={2.25}
          />
          <div>
            <span className="font-semibold">Free preview</span>
            <span className="ml-2 text-[12px] text-v2-foreground-muted">
              {dominantUsed}/{dominantMax} {labels[dominantKey]} used · feel
              the product, then start your 7-day trial
            </span>
          </div>
        </div>
        <Link
          href="/trial-required"
          onClick={() =>
            track({
              name: 'preview_banner_click',
              properties: {
                dimension: dominantKey,
                ratio: dominantRatio,
                used: dominantUsed,
                max: dominantMax,
              },
            })
          }
          className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-v2-gradient-brand px-3 text-[12px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5"
        >
          Start trial
          <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
        </Link>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-v2-surface-sunken">
        <div
          className={`h-full transition-all ${barTone}`}
          style={{ width: `${dominantPct}%` }}
        />
      </div>
    </div>
  )
}
