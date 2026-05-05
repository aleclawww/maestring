/**
 * v2 Input + Label + Field wrapper.
 *
 * Decisions:
 *  - 40px height — matches lg button so they line up in forms
 *  - 8px radius — paired with rounded-lg buttons, never rounded-full
 *  - Focus state uses ring-2 indigo with offset, NOT inner glow (per directive)
 *  - Field wrapper handles label/help/error spacing so consumers don't reinvent it
 */
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ── Input ────────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-10 w-full rounded-lg border bg-v2-surface px-3 text-[14px] text-v2-foreground',
          'placeholder:text-v2-foreground-subtle',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-v2-brand focus-visible:ring-offset-1 focus-visible:ring-offset-v2-background',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          invalid
            ? 'border-v2-error focus:border-v2-error focus-visible:ring-v2-error'
            : 'border-v2-border focus:border-v2-brand',
          className,
        )}
        {...props}
      />
    )
  },
)

// ── Textarea ─────────────────────────────────────────────────────────
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full rounded-lg border bg-v2-surface px-3 py-2.5 text-[14px] text-v2-foreground',
          'placeholder:text-v2-foreground-subtle resize-y',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-v2-brand focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          invalid
            ? 'border-v2-error focus:border-v2-error focus-visible:ring-v2-error'
            : 'border-v2-border focus:border-v2-brand',
          className,
        )}
        {...props}
      />
    )
  },
)

// ── Label ────────────────────────────────────────────────────────────
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn(
        'block text-[13px] font-semibold text-v2-foreground',
        className,
      )}
      {...props}
    />
  )
})

// ── Field — composes label + input + help/error in one go ────────────
export interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: FieldProps) {
  const describedBy = error
    ? `${htmlFor}-error`
    : hint
    ? `${htmlFor}-hint`
    : undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-v2-error">*</span>}
      </Label>
      {/* Inject id + aria-describedby into the controlled child */}
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<Record<string, unknown>>,
            {
              id: htmlFor,
              'aria-describedby': describedBy,
            },
          )
        : children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-[12px] font-medium text-v2-error"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${htmlFor}-hint`}
          className="text-[12px] text-v2-foreground-muted"
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
