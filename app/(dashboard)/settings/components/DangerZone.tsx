'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface DangerZoneProps {
  userId: string
  email: string
}

export function DangerZone({ email }: DangerZoneProps) {
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (confirmEmail !== email) return
    setDeleting(true)
    // Call server action to delete account
    const res = await fetch('/api/profile/me', { method: 'DELETE' })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push('/?deleted=true')
    }
    setDeleting(false)
  }

  async function handleExportData() {
    // Trigger GDPR export
    const res = await fetch('/api/account/export', { method: 'POST' })
    const { message } = await res.json()
    alert(message ?? 'You will receive your data by email within 24-48 hours.')
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
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
