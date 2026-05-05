'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, Field, Input, Button, Eyebrow } from '@/components/v2'

interface ProfileSettingsProps {
  userId: string
  email: string
  fullName: string
  avatarUrl: string
}

export function ProfileSettings({
  userId,
  email,
  fullName,
  avatarUrl,
}: ProfileSettingsProps) {
  const [name, setName] = useState(fullName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      console.error('ProfileSettings save failed', error)
      setSaveError(error.message || 'Could not save. Please try again.')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section>
      <Eyebrow>Profile</Eyebrow>
      <Card padding="lg" className="mt-3 space-y-5">
        {avatarUrl && (
          <div className="flex items-center gap-3">
            <Image
              src={avatarUrl}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border border-v2-border object-cover"
              referrerPolicy="no-referrer"
            />
            <p className="text-[12px] text-v2-foreground-muted">
              Profile picture synced from your sign-in provider
            </p>
          </div>
        )}

        <Field label="Email" htmlFor="settings-email" hint="Your email can't be changed.">
          <Input value={email} disabled />
        </Field>

        <Field label="Full name" htmlFor="settings-name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (saveError) setSaveError(null)
            }}
            placeholder="Your name"
          />
        </Field>

        {saveError && (
          <div
            role="alert"
            className="rounded-lg border border-v2-error/30 bg-v2-error-soft px-3 py-2 text-[13px] text-v2-error"
          >
            {saveError}
          </div>
        )}

        <div>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={name === fullName || saving}
          >
            {saved && <Check className="h-4 w-4" strokeWidth={2.5} />}
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Card>
    </section>
  )
}
