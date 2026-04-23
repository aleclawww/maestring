'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface ProfileSettingsProps {
  userId: string
  email: string
  fullName: string
  avatarUrl: string
}

export function ProfileSettings({ userId, email, fullName, avatarUrl }: ProfileSettingsProps) {
  const [name, setName] = useState(fullName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    await supabase.from('profiles').update({ full_name: name }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-text-primary mb-4 pb-2 border-b border-border">
        Profile
      </h2>
      <div className="space-y-4">
        <Input
          label="Email"
          value={email}
          disabled
          helperText="Your email can't be changed."
        />
        <Input
          label="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
        />
        <Button
          onClick={handleSave}
          loading={saving}
          loadingText="Saving..."
          disabled={name === fullName}
        >
          {saved ? '✓ Saved' : 'Save changes'}
        </Button>
      </div>
    </section>
  )
}
