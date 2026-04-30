'use client'

import { useState } from 'react'

interface NotificationSettingsProps {
  userId: string
  studyMinutesPerDay: number
  emailNudgesEnabled?: boolean
}

export function NotificationSettings({
  studyMinutesPerDay: initialMins,
  emailNudgesEnabled: initialNudges = true,
}: NotificationSettingsProps) {
  const [mins, setMins] = useState(initialMins)
  const [emailNudges, setEmailNudges] = useState(initialNudges)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = mins !== initialMins || emailNudges !== initialNudges

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_minutes_per_day: mins,
          email_nudges_enabled: emailNudges,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? 'Failed to save settings. Please try again.')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-text-primary mb-4 pb-2 border-b border-border">
        Notifications and study
      </h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-text-secondary mb-2 block">
            Study minutes per day: <span className="text-text-primary font-bold">{mins}</span>
          </label>
          <input
            type="range"
            min={10}
            max={120}
            step={10}
            value={mins}
            onChange={e => setMins(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Study minutes per day"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>10 min</span>
            <span>2 hours</span>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={emailNudges}
            onChange={e => setEmailNudges(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">Email reminders</p>
            <p className="text-xs text-text-muted">
              {"You'll get an email when you have overdue concepts and haven't studied today."}
            </p>
          </div>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="text-sm text-success">✓ Saved</span>
          )}
          {error && (
            <span className="text-sm text-danger">{error}</span>
          )}
        </div>
      </div>
    </section>
  )
}
