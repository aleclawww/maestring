'use client'

import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Card, Input } from '@/components/v2'

interface DangerZoneProps {
  email: string
}

export function DangerZone({ email }: DangerZoneProps) {
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (confirmEmail !== email) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/profile/me', { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setDeleteError(
          (j as { error?: string }).error ||
            `Could not delete your account (HTTP ${res.status}). Please try again or contact support.`,
        )
        return
      }
      const { error: signOutErr } = await supabase.auth.signOut()
      if (signOutErr) {
        console.warn(
          'DangerZone signOut failed after delete (cookie may linger briefly)',
          signOutErr,
        )
      }
      router.push('/?deleted=true')
    } catch (err) {
      console.error('DangerZone handleDelete threw', err)
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Unknown error. Please try again.',
      )
    } finally {
      setDeleting(false)
    }
  }

  async function handleExportData() {
    setExportMessage(null)
    try {
      const res = await fetch('/api/account/export', { method: 'POST' })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          message?: string
          error?: string
        }
        setExportMessage(
          j.message ??
            j.error ??
            `Export failed (HTTP ${res.status}). Please try again.`,
        )
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const disposition = res.headers.get('content-disposition') ?? ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      a.href = url
      a.download = filenameMatch?.[1] ?? 'maestring-data.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportMessage('Your data file has been downloaded.')
    } catch (err) {
      console.error('DangerZone handleExportData threw', err)
      setExportMessage(
        err instanceof Error
          ? err.message
          : 'Export failed. Please try again.',
      )
    }
  }

  return (
    <section>
      <p className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-error">
        Danger zone
      </p>

      <div className="mt-3 space-y-4">
        {/* Export */}
        <Card padding="lg">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-v2-surface-subtle text-v2-foreground-muted">
              <Download className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-v2-foreground">
                Export my data
              </p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-v2-foreground-muted">
                Download all your data in JSON format (GDPR Art. 20).
              </p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={handleExportData}>
                  Export data
                </Button>
              </div>
              {exportMessage && (
                <p
                  role="status"
                  className="mt-3 text-[12px] text-v2-foreground-muted"
                >
                  {exportMessage}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Delete */}
        <Card
          padding="lg"
          className="border-l-[3px] border-l-v2-error bg-v2-error-soft/40"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-v2-error-soft text-v2-error">
              <Trash2 className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-v2-error">
                Delete account
              </p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-v2-foreground-muted">
                This action is permanent and irreversible. All your data will
                be deleted.
              </p>

              {!showConfirm ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-v2-error px-4 text-[13px] font-semibold text-white transition-colors hover:opacity-90"
                  >
                    Delete my account
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-[12px] font-medium text-v2-error">
                    Type your email to confirm:
                  </p>
                  <Input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder={email}
                    className="border-v2-error/40 focus:border-v2-error focus-visible:ring-v2-error"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={confirmEmail !== email || deleting}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-v2-error px-4 text-[13px] font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleting ? 'Deleting…' : 'Confirm deletion'}
                    </button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  {deleteError && (
                    <p
                      role="alert"
                      className="text-[12px] font-medium text-v2-error"
                    >
                      {deleteError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
