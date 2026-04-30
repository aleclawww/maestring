'use client'

import { useState } from 'react'

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
      // Clipboard API blocked (mobile Safari on HTTP, iframe sandbox, etc.)
      // Show fallback message so the user knows to select + copy manually.
      setCopyFailed(true)
      setTimeout(() => setCopyFailed(false), 3000)
    }
  }

  const shareText = `I'm prepping for AWS SAA-C03 on Maestring — AI-adaptive questions and spaced repetition. Use my link for 7 days of Pro free: ${url}`
  const encoded = encodeURIComponent(shareText)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-text-primary mb-3">Your referral link</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={url}
            className="input-field font-mono text-sm flex-1"
            onFocus={e => e.currentTarget.select()}
          />
          <button
            onClick={() => copy(url, 'link')}
            className="btn-outline px-3 flex-shrink-0"
            aria-label="Copy referral link"
          >
            {copied === 'link' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Code:{' '}
          <button
            onClick={() => copy(code, 'code')}
            className="font-mono font-bold text-text-primary hover:underline"
            aria-label="Copy code"
          >
            {code}
          </button>{' '}
          {copied === 'code' && <span className="text-success">✓ copied</span>}
        </p>
        {copyFailed && (
          <p className="text-xs text-amber-400 mt-1" role="alert">
            Clipboard access blocked — select the text above and copy manually.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`https://twitter.com/intent/tweet?text=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline text-xs px-3 py-1.5"
        >
          Share on X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline text-xs px-3 py-1.5"
        >
          LinkedIn
        </a>
        <a
          href={`https://wa.me/?text=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline text-xs px-3 py-1.5"
        >
          WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent('Maestring — AWS SAA-C03 prep')}&body=${encoded}`}
          className="btn-outline text-xs px-3 py-1.5"
        >
          Email
        </a>
      </div>
    </div>
  )
}
