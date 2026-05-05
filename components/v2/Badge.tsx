/**
 * v2 Badge / Pill primitive.
 *
 * Two distinct shapes for two distinct uses:
 *  - <Badge>: compact, tighter (status pills, cert codes, "NEW" tags)
 *  - <Pill>:  spacious, used for "Most popular" call-outs and decorative eyebrows
 *
 * All-caps mono for status codes (SAA-C03, ASSOCIATE) — body sans for
 * conversational labels (Most popular, New).
 */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral:
          'bg-v2-surface border border-v2-border text-v2-foreground-muted',
        brand:
          'bg-v2-brand-soft text-v2-brand border border-v2-brand/15',
        accent:
          'bg-v2-accent-soft-2 text-v2-accent border border-v2-accent/15',
        success:
          'bg-v2-success-soft text-v2-success border border-v2-success/15',
        warning:
          'bg-v2-warning-soft text-v2-warning border border-v2-warning/15',
        error:
          'bg-v2-error-soft text-v2-error border border-v2-error/15',
        gradient:
          'bg-v2-gradient-brand text-white border border-transparent shadow-v2-button',
        dark:
          'bg-v2-foreground text-white border border-transparent',
      },
      size: {
        sm: 'h-5 px-1.5 text-[10px] rounded',
        md: 'h-6 px-2 text-[11px] rounded-md',
        lg: 'h-7 px-2.5 text-[12px] rounded-md',
      },
      mono: {
        true: 'font-v2-mono uppercase tracking-v2-wide',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
      mono: false,
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({
  className,
  tone,
  size,
  mono,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ tone, size, mono }), className)}
      {...props}
    />
  )
}

// ── Pill — spacious eyebrow / "most popular" / nav active state ─────
const pillVariants = cva(
  'inline-flex items-center gap-1.5 font-semibold whitespace-nowrap rounded-full',
  {
    variants: {
      tone: {
        neutral:
          'bg-v2-surface border border-v2-border text-v2-foreground-muted',
        brand:
          'bg-v2-brand-soft border border-v2-brand/20 text-v2-brand',
        gradient:
          'bg-v2-gradient-brand text-white border border-transparent shadow-v2-button',
        outlined:
          'bg-transparent border border-v2-brand/30 text-v2-brand',
      },
      size: {
        md: 'h-7 px-3 text-[12px]',
        lg: 'h-8 px-3.5 text-[13px]',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
    },
  },
)

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

export function Pill({ className, tone, size, ...props }: PillProps) {
  return (
    <span
      className={cn(pillVariants({ tone, size }), className)}
      {...props}
    />
  )
}

// ── Eyebrow — gradient-accent line + uppercase mono label ────────────
export function Eyebrow({
  children,
  className,
  align = 'left',
}: {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center'
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      <span aria-hidden className="h-px w-8 bg-v2-gradient-brand" />
      <span className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-brand">
        {children}
      </span>
    </div>
  )
}

export { badgeVariants, pillVariants }
