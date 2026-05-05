/**
 * Toast helper — thin abstraction over sonner.
 *
 * The point of this wrapper is so callers don't import `sonner` directly.
 * If we ever swap the underlying library (or add cross-cutting behavior like
 * analytics on every toast), only this file changes.
 *
 * Keep the surface minimal. Add cases as real consumers need them.
 */

import { toast as sonnerToast } from 'sonner'

export interface ToastOptions {
  /** When true, the toast stays until the user dismisses it. Maps to duration: Infinity. */
  sticky?: boolean
  /** Stable id for deduplication — calling toast.info(..., { id }) twice replaces the existing toast. */
  id?: string | number
  /** Optional CTA rendered inside the toast. The caller is responsible for navigation/side-effects. */
  action?: { label: string; onClick: () => void }
}

type Variant = 'info' | 'success' | 'warning' | 'error'

function emit(variant: Variant, message: string, opts?: ToastOptions): void {
  const sonnerOpts: Parameters<typeof sonnerToast>[1] = {}
  if (opts?.id !== undefined) sonnerOpts.id = opts.id
  if (opts?.sticky) sonnerOpts.duration = Infinity
  if (opts?.action) sonnerOpts.action = { label: opts.action.label, onClick: opts.action.onClick }

  switch (variant) {
    case 'info':
      sonnerToast.info(message, sonnerOpts)
      return
    case 'success':
      sonnerToast.success(message, sonnerOpts)
      return
    case 'warning':
      sonnerToast.warning(message, sonnerOpts)
      return
    case 'error':
      sonnerToast.error(message, sonnerOpts)
      return
  }
}

export const toast = {
  info: (message: string, opts?: ToastOptions) => emit('info', message, opts),
  success: (message: string, opts?: ToastOptions) => emit('success', message, opts),
  warning: (message: string, opts?: ToastOptions) => emit('warning', message, opts),
  error: (message: string, opts?: ToastOptions) => emit('error', message, opts),
} as const
