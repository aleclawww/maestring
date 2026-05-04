import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Button variants extracted into their own non-'use client' module so server
 * components (e.g. /pricing, /trial-required) can import the className helper
 * to style the third-party UpgradeButton without crossing the RSC boundary
 * with a function value (which breaks at runtime as `(0, p.d) is not a function`).
 */
export const buttonVariants = cva(
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

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
