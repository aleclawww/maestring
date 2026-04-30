'use client'

import { useState, useRef, useEffect } from 'react'
import { formatBytes, formatRelativeTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'

interface Document {
  id: string
  filename: string
  file_size: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  chunk_count: number
  created_at: string
  error_message: string | null
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing documents on mount. Previously this was missing, so a user
  // who uploaded documents in a previous session would always see the empty
  // state ("You haven't uploaded any documents yet").
  useEffect(() => {
    fetch('/api/documents')
      .then(async res => {
        if (!res.ok) return
        const { data } = await res.json()
        if (Array.isArray(data)) setDocuments(data as Document[])
      })
      .catch(() => {/* fail silently — user can still upload */})
      .finally(() => setLoading(false))
  }, [])

  async function handleFileUpload(file: File) {
    if (!file.type.includes('pdf')) {
      setUploadError('Only PDF files are accepted.')
      return
    }
    // Server enforces 50 MB (see app/api/documents/upload/route.ts
    // MAX_FILE_SIZE). The old 100 MB client limit meant a 60 MB upload
    // happily passed this guard, hit the server, got rejected with "File
    // too large (max 50 MB)", then the old catch-all swallowed that
    // server message and showed a generic "Error uploading the file.
    // Try again." — so the user retried the same 60 MB file forever.
    // Align the client limit and match the server's humanized size.
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File can't exceed 50 MB.")
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      // Previously: `if (!res.ok) throw new Error('Upload failed')` threw
      // into the bare `catch {}` which set a generic "Error uploading the
      // file. Try again." — completely discarding the server's structured
      // error (rate-limit 429 "Upload limit reached (10 per hour)",
      // 400 "Only PDF files are supported", 400 "File too large",
      // 500 "Upload failed", 500 "Failed to create document record").
      // A rate-limited user kept retrying because the UI never surfaced
      // "wait an hour" — the actionable message was sitting right there
      // in the response body. Parse the body and prefer the server's
      // message over our generic fallback.
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        setUploadError(j.message ?? j.error ?? `Upload failed (HTTP ${res.status}). Please try again.`)
        return
      }

      const { data } = await res.json()
      setDocuments(prev => [data, ...prev])
    } catch (err) {
      console.error('Documents upload network error', err)
      setUploadError('Network error while uploading. Check your connection and try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId)
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        console.error('Delete failed', j.error)
        return
      }
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      console.error('Delete network error', err)
    } finally {
      setDeletingId(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const statusBadge = (status: Document['processing_status']) => {
    const map = {
      pending: { variant: 'outline' as const, label: 'Pending' },
      processing: { variant: 'warning' as const, label: 'Processing...' },
      completed: { variant: 'success' as const, label: 'Ready' },
      failed: { variant: 'danger' as const, label: 'Error' },
    }
    const { variant, label } = map[status]
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary mb-1">Documents</h1>
        <p className="text-sm text-text-secondary">
          Upload your study PDFs and we'll turn them into personalized questions.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-surface/50 p-12 text-center transition-colors"
      >
        <div className="text-4xl mb-3">{uploading ? '⏳' : '📤'}</div>
        <p className="text-sm font-medium text-text-primary mb-1">
          {uploading ? 'Uploading...' : 'Drag your PDF here or click to browse'}
        </p>
        <p className="text-xs text-text-muted">PDF up to 50 MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
            e.target.value = ''
          }}
        />
      </div>

      {uploadError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {uploadError}
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl border border-border bg-surface animate-pulse" />
          ))}
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map(doc => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{doc.filename}</p>
                    <p className="text-xs text-text-muted">
                      {formatBytes(doc.file_size)} · {formatRelativeTime(doc.created_at)}
                      {doc.chunk_count > 0 && ` · ${doc.chunk_count} chunks`}
                    </p>
                    {doc.error_message && (
                      <p className="text-xs text-danger mt-0.5">{doc.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex items-center gap-3">
                  {statusBadge(doc.processing_status)}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    aria-label={`Delete ${doc.filename}`}
                    className="text-text-muted hover:text-danger transition-colors disabled:opacity-40 text-sm"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? '…' : '✕'}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-text-secondary">You haven't uploaded any documents yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Upload notes, whitepapers, or study guides to generate personalized questions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
