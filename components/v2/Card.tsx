/**
 * v2 Card primitive set.
 *
 * The card is the workhorse of the entire system. It carries Corporate
 * Trust's signature: white surface + colored shadow + lift on hover.
 *
 * Composition: <Card> wraps <CardHeader>, <CardTitle>, <CardDescription>,
 * <CardContent>, <CardFooter>. This mirrors shadcn convention so anyone
 * familiar with the ecosystem can read it cold.
 *
 * Tone variants:
 *  - default: white + shadow-soft
 *  - flat: subtle bg, no shadow, used in dashboard for sub-panels
 *  - emphasized: scaled up + ring, used for the highlighted pricing tier
 */
'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'relative rounded-xl border transition-all duration-200 ease-v2',
  {
    variants: {
      tone: {
        default: 'bg-v2-surface border-v2-border shadow-v2-soft',
        flat: 'bg-v2-surface-subtle border-v2-border-subtle',
        outline: 'bg-v2-surface border-v2-border',
        emphasized:
          'bg-v2-surface border-v2-brand/30 shadow-v2-elevated ring-1 ring-v2-brand/20',
        dark: 'bg-v2-gradient-deep border-transparent text-v2-deep-foreground shadow-v2-elevated',
      },
      interactive: {
        true: 'cursor-pointer hover:-translate-y-1 hover:shadow-v2-elevated hover:border-v2-brand/30',
        false: '',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      tone: 'default',
      interactive: false,
      padding: 'md',
    },
  },
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, tone, interactive, padding, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariants({ tone, interactive, padding }), className)}
      {...props}
    />
  )
})

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardHeader({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  )
})

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function CardTitle({ className, ...props }, ref) {
  return (
    <h3
      ref={ref}
      className={cn(
        'text-[18px] font-bold leading-[1.3] tracking-v2-tight text-v2-foreground',
        className,
      )}
      {...props}
    />
  )
})

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return (
    <p
      ref={ref}
      className={cn(
        'text-[14px] leading-[1.6] text-v2-foreground-muted',
        className,
      )}
      {...props}
    />
  )
})

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn('mt-5', className)} {...props} />
})

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('mt-6 flex items-center gap-3', className)}
      {...props}
    />
  )
})

export { cardVariants }
