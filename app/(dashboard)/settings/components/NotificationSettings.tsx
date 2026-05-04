'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Card, Button, Eyebrow } from '@/components/v2'

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
      <Eyebrow>Notifications &amp; study</Eyebrow>
      <Card padding="lg" className="mt-3 space-y-6">
        {/* Minutes/day slider */}
        <div>
          <div className="flex items-baseline justify-between">
            <label
              htmlFor="study-mins"
              className="text-[13px] font-semibold text-v2-foreground"
            >
              Study minutes per day
            </label>
            <span className="font-v2-mono text-[14px] font-bold text-v2-brand">
              {mins} min
            </span>
          </div>
          <input
            id="study-mins"
            type="range"
            min={10}
            max={120}
            step={10}
            value={mins}
            onChange={(e) => setMins(Number(e.target.value))}
            className="mt-3 w-full accent-v2-brand"
          />
          <div className="mt-1 flex justify-between font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            <span>10 min</span>
            <span>2 hours</span>
          </div>
        </div>

        {/* Email nudges */}
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-v2-border bg-v2-surface-subtle/50 p-4 transition-colors hover:border-v2-border-strong">
          <input
            type="checkbox"
            checked={emailNudges}
            onChange={(e) => setEmailNudges(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-v2-border text-v2-brand accent-v2-brand"
          />
          <div>
            <p className="text-[14px] font-bold text-v2-foreground">
              Email reminders
            </p>
            <p className="mt-0.5 text-[12px] leading-[1.55] text-v2-foreground-muted">
              You'll get an email when you have overdue concepts and haven't
              studied today.
            </p>
          </div>
        </label>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty}
            loading={saving}
          >
            {saved && <Check className="h-4 w-4" strokeWidth={2.5} />}
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save changes'}
          </Button>
          {error && (
            <span className="text-[13px] font-medium text-v2-error">
              {error}
            </span>
          )}
        </div>
      </Card>
    </section>
  )
}
