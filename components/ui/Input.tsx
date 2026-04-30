import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    // Link error/helper text to the input for screen readers so assistive
    // technology announces the hint or validation message when the field is
    // focused, not just when the user visually scans the form.
    const descriptionId = inputId ? `${inputId}-desc` : undefined

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-describedby={(error || helperText) ? descriptionId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-colors focus:outline-none focus:ring-1',
            error
              ? 'border-danger focus:border-danger focus:ring-danger'
              : 'border-border focus:border-primary focus:ring-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && (
          <p id={descriptionId} className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={descriptionId} className="text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
