'use client'

import { Wrench } from 'lucide-react'
import { Card } from '@/components/v2'
import type { SetupWarning } from '@/lib/config-check'

export function SetupWarningBanner({ warnings }: { warnings: SetupWarning[] }) {
  if (warnings.length === 0) return null

  return (
    <Card padding="md" className="border-l-[3px] border-l-v2-warning bg-v2-warning-soft/30">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-v2-warning" strokeWidth={2.25} />
        <p className="text-[14px] font-bold text-v2-foreground">
          Optional features not yet configured
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {warnings.map((w) => (
          <div
            key={w.feature}
            className="rounded-lg border border-v2-border bg-v2-surface p-3"
          >
            <p className="text-[13px] font-semibold text-v2-foreground">
              {w.feature}
            </p>
            <p className="mt-0.5 text-[12px] leading-[1.55] text-v2-foreground-muted">
              {w.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {w.envVars.map((v) => (
                <code
                  key={v}
                  className="rounded border border-v2-border-subtle bg-v2-surface-subtle px-1.5 py-0.5 font-v2-mono text-[10px] text-v2-foreground-muted"
                >
                  {v}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-v2-foreground-subtle">
        Add these to your{' '}
        <code className="font-v2-mono">.env.local</code> (local dev) or Vercel
        environment variables (production), then restart the server.
      </p>
    </Card>
  )
}
