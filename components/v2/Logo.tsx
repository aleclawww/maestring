/**
 * Maestring wordmark.
 *
 * The dot after the "g" is the brand's only graphic mark — a small
 * indigo→violet gradient circle that earns the gradient its keep on every
 * page. We avoid an SVG mark elsewhere; the wordmark is the identity.
 *
 * Sizes track the spec: 28px nav, 32px auth header, 24px sidebar.
 */
import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface LogoProps {
  className?: string
  /** Pixel height of the wordmark text. Dot scales with it. */
  size?: number
  /** Render as a Link to `/` — default true. Pass false in auth headers. */
  asLink?: boolean
  /** Override the link target (e.g. /app for the dashboard logo). */
  href?: string
}

export function Logo({
  className,
  size = 22,
  asLink = true,
  href = '/',
}: LogoProps) {
  const dotSize = Math.max(6, Math.round(size * 0.28))

  const inner = (
    <span
      className={cn(
        'inline-flex items-baseline gap-[2px] font-bold leading-none tracking-tight text-v2-foreground',
        className,
      )}
      style={{ fontSize: `${size}px` }}
    >
      <span>maestring</span>
      <span
        aria-hidden
        className="inline-block translate-y-[1px] rounded-full bg-v2-gradient-brand shadow-v2-button"
        style={{ width: dotSize, height: dotSize }}
      />
    </span>
  )

  if (!asLink) return inner
  return (
    <Link
      href={href}
      aria-label="Maestring home"
      className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-brand focus-visible:ring-offset-2 focus-visible:ring-offset-v2-background rounded"
    >
      {inner}
    </Link>
  )
}
