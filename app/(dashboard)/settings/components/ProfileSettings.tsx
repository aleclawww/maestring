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
  // The previous `handleSave` collapsed `{ data, error }` from the update into
  // nothing and then unconditionally showed "✓ Saved". A failing update (RLS
  // misconfig, Supabase outage, auth token expiry) left the user believing
  // their name was saved when it wasn't — and on the next page load they
  // would see the old value and file a "my settings don't stick" ticket
  // that's impossible to reproduce without the original error. Surface the
  // error in the UI (same `text-danger` pattern the TestimonialForm uses in
  // this same folder) so the user knows to retry and we have a concrete
  // signal instead of a phantom bug.
  const [saveError, setSaveError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', userId)
    setSaving(false)
    if (error) {
      // Log to the browser console too — it costs nothing and gives support
      // a stack/message if the user copies it out of DevTools.
      console.error('ProfileSettings save failed', error)
      setSaveError(error.message || 'Could not save. Please try again.')
      return
    }
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
          onChange={e => {
            setName(e.target.value)
            // Clear a stale error the moment the user edits again — otherwise
            // the red text lingers past the retry intent.
            if (saveError) setSaveError(null)
          }}
          placeholder="Your name"
        />
        {saveError && (
          <div className="text-sm text-danger" role="alert">
            {saveError}
          </div>
        )}
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
