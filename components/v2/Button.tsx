/**
 * v2 Button — Corporate Trust primitive.
 *
 * Variants:
 *  - primary: indigo→violet gradient, shadow-button, lift on hover
 *  - secondary: white surface, slate border, soft hover
 *  - ghost: transparent, text-only, used in nav and tertiary actions
 *  - dark: slate-900 fill, used as alternative dark CTA
 *
 * `buttonVariants` lives in ./button-variants.ts (no 'use client') so server
 * components can import it without crossing the RSC boundary with a function
 * value (which fails at runtime as `(0, p.d) is not a function`).
 */
'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonVariantProps } from './button-variants'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
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
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
        )}
        {children}
      </button>
    )
  },
)

export { buttonVariants }
