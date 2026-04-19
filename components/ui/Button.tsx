import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary shadow-sm hover:shadow-glow',
        outline: 'border border-border bg-transparent text-text-primary hover:bg-surface hover:border-primary/50 focus:ring-primary',
        ghost: 'bg-transparent text-text-secondary hover:bg-surface hover:text-text-primary focus:ring-primary',
        danger: 'bg-danger text-white hover:bg-danger-dark focus:ring-danger shadow-sm',
        success: 'bg-success text-white hover:bg-success-dark focus:ring-success shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  loadingText?: string
}

export function Button({
  className,
  variant,
  size,
  loading,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export { buttonVariants }
