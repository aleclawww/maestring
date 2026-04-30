'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { NotificationItem } from '@/app/api/notifications/route'

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  // Fetch on mount so the badge shows immediately without waiting for the
  // dropdown to be opened. Keep it lightweight — just a count + short list.
  useEffect(() => {
    fetch('/api/notifications')
      .then(r => (r.ok ? r.json() : null))
      .then((j: { data: { items: NotificationItem[]; unread: number } } | null) => {
        if (!j) return
        setItems(j.data.items)
        setUnread(j.data.unread)
      })
      .catch(() => {/* fail silently — badge stays at 0 */})
      .finally(() => setLoading(false))
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const typeClass: Record<NotificationItem['type'], string> = {
    review:  'text-primary',
    warning: 'text-warning',
    info:    'text-sky-400',
    success: 'text-success',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>

        {/* Badge — only visible once loaded and count > 0 */}
        {!loading && unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold leading-none text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
            {unread > 0 && (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                {unread} new
              </span>
            )}
          </div>

          {/* Body */}
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-text-muted">Loading…</div>
          ) : !items || items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-text-muted">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {items.map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="mt-0.5 shrink-0 text-base leading-none">{item.icon}</span>
                  <p className={`text-sm ${typeClass[item.type]}`}>{item.message}</p>
                </Link>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border px-4 py-2">
            <Link
              href="/progress"
              onClick={() => setOpen(false)}
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              View full progress →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
