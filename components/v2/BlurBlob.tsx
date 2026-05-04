/**
 * Atmospheric blur orb — Corporate Trust signature #3.
 *
 * Used absolutely-positioned inside an `isolate` parent. Wrap your section
 * with `relative isolate overflow-hidden` and drop one or two of these in.
 * They sit at z-0; bring real content up with z-10.
 */
import { cn } from '@/lib/utils'

export interface BlurBlobProps {
  className?: string
  /** Hex or any CSS background. Defaults to brand gradient. */
  background?: string
  /** Square size in px (or any CSS length). */
  size?: number | string
  /** 0-1, defaults 0.4. */
  opacity?: number
  /** Add slow pulse animation. */
  animated?: boolean
}

export function BlurBlob({
  className,
  background = 'var(--v2-gradient-brand)',
  size = 480,
  opacity = 0.4,
  animated = false,
}: BlurBlobProps) {
  const dim = typeof size === 'number' ? `${size}px` : size
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute -z-10 rounded-full blur-3xl',
        animated && 'v2-animate-pulse-soft',
        className,
      )}
      style={{ background, width: dim, height: dim, opacity }}
    />
  )
}
