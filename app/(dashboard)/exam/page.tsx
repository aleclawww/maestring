'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ExamIntroPage() {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/exam/start', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message ?? json.error ?? 'No se pudo iniciar el simulacro')
        setStarting(false)
        return
      }
      router.push(`/exam/${json.data.id}`)
    } catch {
      setError('Error de red')
      setStarting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        <div className="text-6xl mb-6">📝</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Simulacro SAA-C03</h1>
        <p className="text-text-secondary mb-8">
          Réplica del examen oficial con las mismas condiciones.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-2xl font-bold text-text-primary">65</p>
            <p className="text-xs text-text-muted">Preguntas</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-2xl font-bold text-text-primary">130</p>
            <p className="text-xs text-text-muted">Minutos</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-2xl font-bold text-text-primary">720</p>
            <p className="text-xs text-text-muted">Puntos para aprobar</p>
          </div>
        </div>
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning text-left">
          <p className="font-semibold mb-1">⚠️ Condiciones del simulacro</p>
          <ul className="text-xs text-warning/80 space-y-1 list-disc list-inside">
            <li>El cronómetro es server-side: no se para al recargar.</li>
            <li>El examen se envía automáticamente al agotar el tiempo.</li>
            <li>Puedes marcar preguntas para revisar más tarde.</li>
          </ul>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}
        <button
          onClick={start}
          disabled={starting}
          className="btn-primary w-full text-base py-3 disabled:opacity-50"
        >
          {starting ? 'Iniciando…' : '🚀 Comenzar simulacro'}
        </button>
      </div>
    </div>
  )
}
