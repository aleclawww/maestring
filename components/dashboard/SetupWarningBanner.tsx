'use client'

import type { SetupWarning } from '@/lib/config-check'

export function SetupWarningBanner({ warnings }: { warnings: SetupWarning[] }) {
  if (warnings.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔧</span>
        <p className="text-sm font-semibold text-text-secondary">
          Optional features not yet configured
        </p>
      </div>
      <div className="space-y-2">
        {warnings.map(w => (
          <div key={w.feature} className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-sm font-medium text-text-primary mb-1">{w.feature}</p>
            <p className="text-xs text-text-secondary mb-2">{w.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {w.envVars.map(v => (
                <code
                  key={v}
                  className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-muted"
                >
                  {v}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text-muted">
        Add these to your <code className="font-mono">.env.local</code> (local dev) or Vercel environment variables (production), then restart the server.
      </p>
    </div>
  )
}
