'use client'

import { useState } from 'react'
import { Check, Copy, Linkedin, Mail, MessageCircle, Twitter } from 'lucide-react'
import { Button, Input } from '@/components/v2'

export function ShareBlock({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)

  async function copy(value: string, which: 'link' | 'code') {
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopyFailed(true)
      setTimeout(() => setCopyFailed(false), 3000)
    }
  }

  const shareText = `I'm prepping for AWS SAA-C03 on Maestring — AI-adaptive questions and spaced repetition. Use my link for 7 days of Pro free: ${url}`
  const encoded = encodeURIComponent(shareText)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] font-semibold text-v2-foreground">
          Your referral link
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            type="text"
            readOnly
            value={url}
            className="flex-1 font-v2-mono"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            variant="secondary"
            onClick={() => copy(url, 'link')}
            aria-label="Copy referral link"
          >
            {copied === 'link' ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-v2-foreground-muted">
          Code:{' '}
          <button
            onClick={() => copy(code, 'code')}
            className="font-v2-mono font-bold text-v2-foreground hover:underline"
            aria-label="Copy code"
          >
            {code}
          </button>{' '}
          {copied === 'code' && (
            <span className="inline-flex items-center gap-1 text-v2-success">
              <Check className="h-3 w-3" strokeWidth={2.5} />
              copied
            </span>
          )}
        </p>
        {copyFailed && (
          <p
            role="alert"
            className="mt-1 text-[12px] font-medium text-v2-warning"
          >
            Clipboard access blocked — select the text above and copy manually.
          </p>
        )}
      </div>

      <div>
        <p className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Or share via
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <ShareLink
            href={`https://twitter.com/intent/tweet?text=${encoded}`}
            Icon={Twitter}
            label="X"
          />
          <ShareLink
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
            Icon={Linkedin}
            label="LinkedIn"
          />
          <ShareLink
            href={`https://wa.me/?text=${encoded}`}
            Icon={MessageCircle}
            label="WhatsApp"
          />
          <ShareLink
            href={`mailto:?subject=${encodeURIComponent('Maestring — AWS SAA-C03 prep')}&body=${encoded}`}
            Icon={Mail}
            label="Email"
            external={false}
          />
        </div>
      </div>
    </div>
  )
}

function ShareLink({
  href,
  Icon,
  label,
  external = true,
}: {
  href: string
  Icon: typeof Twitter
  label: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-v2-border bg-v2-surface px-3 text-[12px] font-semibold text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </a>
  )
}
