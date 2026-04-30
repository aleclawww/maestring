'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface DangerZoneProps {
  email: string
}

export function DangerZone({ email }: DangerZoneProps) {
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // Previously `handleDelete` on a failed DELETE just flipped `deleting`
  // back to false with no message — the user saw the button pop back and
  // no feedback, stuck in a confused retry loop. Same for `handleExportData`
  // which never checked `res.ok` and alerted the success copy even on 5xx.
  // Track errors explicitly so each flow shows real feedback.
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (confirmEmail !== email) return
    setDeleting(true)
    setDeleteError(null)
    try {
      // Call server action to delete account
      const res = await fetch('/api/profile/me', { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setDeleteError(
          (j as { error?: string }).error ||
            `Could not delete your account (HTTP ${res.status}). Please try again or contact support.`
        )
        return
      }
      // signOut cleans the session cookie so the user can't navigate back
      // into the dashboard after deletion. A silent failure here previously
      // left a lingering session cookie — user hit /?deleted=true but the
      // middleware still treated them as authenticated on the next click.
      // Log but still redirect — the server-side auth user has been wiped,
      // so the cookie is dead anyway and any retry will land on /login.
      const { error: signOutErr } = await supabase.auth.signOut()
      if (signOutErr) {
        console.warn('DangerZone signOut failed after delete (cookie may linger briefly)', signOutErr)
      }
      router.push('/?deleted=true')
    } catch (err) {
      console.error('DangerZone handleDelete threw', err)
      setDeleteError(err instanceof Error ? err.message : 'Unknown error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleExportData() {
    setExportMessage(null)
    try {
      // GDPR Art. 20 data portability export.
      // The API returns a JSON file attachment — we download it client-side
      // via a Blob URL so the user gets the file without a page navigation.
      // On error (non-2xx) we parse the JSON body for an error message and
      // surface it inline — no more silent 404 from a missing route or
      // cryptic "Failed to fetch" on a network blip.
      const res = await fetch('/api/account/export', { method: 'POST' })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
        setExportMessage(
          j.message ?? j.error ?? `Export failed (HTTP ${res.status}). Please try again.`
        )
        return
      }
      // Success — stream body to a temporary Blob URL and click-download it.
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
      setExportMessage('✓ Your data file has been downloaded.')
    } catch (err) {
      console.error('DangerZone handleExportData threw', err)
      setExportMessage(err instanceof Error ? err.message : 'Export failed. Please try again.')
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-danger mb-4 pb-2 border-b border-danger/30">
        Danger zone
      </h2>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text-primary mb-1">Export my data</p>
          <p className="text-xs text-text-muted mb-3">
            Download all your data in JSON format (GDPR Art. 20).
          </p>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            Export data
          </Button>
          {exportMessage && (
            <p className="mt-2 text-xs text-text-secondary" role="status">
              {exportMessage}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-medium text-danger mb-1">Delete account</p>
          <p className="text-xs text-danger/80 mb-3">
            This action is permanent and irreversible. All your data will be deleted.
          </p>
          {!showConfirm ? (
            <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
              Delete my account
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-danger">Type your email to confirm:</p>
              <input
                type="email"
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
                placeholder={email}
                className="input-field border-danger/50 focus:border-danger"
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={confirmEmail !== email || deleting}
                  loading={deleting}
                  loadingText="Deleting..."
                >
                  Confirm deletion
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
              </div>
              {deleteError && (
                <p className="text-xs text-danger" role="alert">
                  {deleteError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
