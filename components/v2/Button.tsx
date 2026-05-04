/**
 * v2 Button — Corporate Trust primitive.
 *
 * Variants:
 *  - primary: indigo→violet gradient, shadow-button, lift on hover
 *  - secondary: white surface, slate border, soft hover
 *  - ghost: transparent, text-only, used in nav and tertiary actions
 *  - dark: slate-900 fill, used as alternative dark CTA
 *
 * Sizes follow the directive: 36 / 40 / 44 / 32.
 *
 * Polymorphic via `asChild` (Radix-style) is overkill here — instead, when a
 * link is needed, wrap a Button in <Link href> using Next's <Link> primitive,
 * or use the `as="a"` shorthand (kept narrow on purpose).
 */
'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base — every button shares this
  [
    'group/btn inline-flex items-center justify-center gap-2',
    'font-semibold whitespace-nowrap select-none',
    'transition-all duration-200 ease-v2',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-brand focus-visible:ring-offset-2 focus-visible:ring-offset-v2-background',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-v2-gradient-brand text-white shadow-v2-button hover:-translate-y-0.5 hover:shadow-v2-elevated active:translate-y-0',
        secondary:
          'bg-v2-surface text-v2-foreground border border-v2-border shadow-v2-soft hover:bg-v2-surface-subtle hover:border-v2-border-strong hover:-translate-y-0.5',
        ghost:
          'bg-transparent text-v2-foreground-muted hover:text-v2-foreground hover:bg-v2-surface-subtle',
        dark:
          'bg-v2-foreground text-white hover:bg-v2-deep-darker hover:-translate-y-0.5 hover:shadow-v2-elevated',
        link:
          'bg-transparent text-v2-brand hover:text-v2-brand-hover underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] rounded-md',
        md: 'h-10 px-4 text-[14px] rounded-lg',
        lg: 'h-11 px-5 text-[15px] rounded-lg',
        xl: 'h-12 px-6 text-[15px] rounded-lg',
        pill: 'h-11 px-6 text-[15px] rounded-full',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, loading, children, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />}
        {children}
      </button>
    )
  },
)

export { buttonVariants }
