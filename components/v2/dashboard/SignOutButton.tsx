/**
 * Sign-out button for the dashboard sidebar.
 *
 * Calls supabase.auth.signOut() (which clears the SSR session cookie via
 * the @supabase/ssr browser client) and then hard-navigates to '/'. Hard
 * navigation guarantees the next page render is server-side with a clean
 * unauthenticated request — no stale RSC cache leaking a previous user's
 * dashboard.
 *
 * This is intentionally a discrete sidebar row rather than a dropdown
 * menu — discoverability beats elegance for an MVP. Lower priority than
 * the active nav items, hence the muted color treatment.
 */
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const [pending, setPending] = React.useState(false)
  const router = useRouter()

  const handleClick = React.useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      // Even if the network call fails, clearing local session state is
      // still useful. We swallow and force-navigate; the user lands on a
      // page that will redirect to /login if the cookie is somehow still
      // valid server-side.
      // eslint-disable-next-line no-console
      console.warn('Sign-out failed locally:', err)
    } finally {
      // window.location for a true full reload — the middleware will see
      // no auth cookie and the layout will not flicker stale UI.
      window.location.assign('/')
      // Fallback router push in case window.location is somehow blocked.
      router.push('/')
    }
  }, [pending, router])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" strokeWidth={2} />
      <span>{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  )
}
