'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

export interface ReadinessData {
  score: number
  confidence_low: number
  confidence_high: number
  pass_probability: number
  velocity_per_week: number
  by_domain: Array<{
    domain_id: string
    name: string
    weight_percent: number
    score: number
    concepts: number
    studied: number
  }>
  weakest_domain: string | null
  weakest_domain_id: string | null
  weakest_concepts: Array<{
    concept_id: string
    slug: string
    name: string
    stability: number
    reps: number
  }>
  at_risk_count: number
  total_concepts: number
  studied_concepts: number
  eta_ready_date: string | null
  history: Array<{ date: string; score: number; pass_probability: number }>
}

interface AtRiskItem {
  conceptId: string
  slug: string
  name: string
  domainName: string | null
  stability: number
  lapses: number
  reps: number
  nextReviewDate: string | null
}

function bandColor(score: number) {
  if (score >= 75)
    return {
      ring: 'stroke-success',
      bar: 'bg-success',
      text: 'text-success',
      bg: 'bg-success/10',
      border: 'border-l-success',
      label: 'Preparado',
    }
  if (score >= 50)
    return {
      ring: 'stroke-warning',
      bar: 'bg-warning',
      text: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-l-warning',
      label: 'En progreso',
    }
  return {
    ring: 'stroke-danger',
    bar: 'bg-danger',
    text: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-l-danger',
    label: 'Construyendo base',
  }
}

function Gauge({ score, low, high }: { score: number; low: number; high: number }) {
  const r = 80
  const circ = Math.PI * r
  const clamp = (v: number) => Math.max(0, Math.min(100, v)) / 100
  const dashMain = circ * clamp(score)
  const dashLow = circ * clamp(low)
  const dashHigh = circ * clamp(high)
  const band = bandColor(score)
  // Confidence band rendered as a lighter arc behind the main stroke.
  return (
    <div className="relative w-[200px] h-[120px]">
      <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="14"
          className="stroke-border"
          strokeLinecap="round"
        />
        {/* Uncertainty band (high) */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="14"
          className={cn(band.ring, 'opacity-25')}
          strokeLinecap="round"
          strokeDasharray={`${dashHigh} ${circ}`}
        />
        {/* Point estimate */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="14"
          className={band.ring}
          strokeLinecap="round"
          strokeDasharray={`${dashMain} ${circ}`}
        />
        {/* Low-end tick */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="3"
          className={cn(band.ring, 'opacity-80')}
          strokeLinecap="round"
          strokeDasharray={`${dashLow} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className={cn('text-4xl font-bold leading-none', band.text)}>
          {Math.round(score)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
          ±{Math.max(1, Math.round((high - low) / 2))} pts · 95%
        </span>
      </div>
    </div>
  )
}

function Sparkline({
  series,
  accent = 'currentColor',
}: {
  series: Array<{ date: string; score: number }>
  accent?: string
}) {
  if (series.length < 2) {
    return (
      <p className="text-[10px] text-text-muted italic">
        Trend disponible tras 2 snapshots diarios
      </p>
    )
  }
  const W = 160
  const H = 36
  const min = Math.min(...series.map(p => p.score))
  const max = Math.max(...series.map(p => p.score))
  const range = Math.max(1, max - min)
  const pts = series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * W
      const y = H - ((p.score - min) / range) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
      <circle
        cx={W}
        cy={H - ((series[series.length - 1]!.score - min) / range) * H}
        r="2.2"
        fill={accent}
      />
    </svg>
  )
}

export function ReadinessCard({ data }: { data: ReadinessData }) {
  const band = bandColor(data.score)
  const eta = data.eta_ready_date
    ? new Date(data.eta_ready_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    : null
  const coverage = data.total_concepts > 0
    ? Math.round((data.studied_concepts / data.total_concepts) * 100)
    : 0

  const passPct = Math.round((data.pass_probability ?? 0) * 100)
  const velocity = Number(data.velocity_per_week ?? 0)
  const velocityLabel = velocity > 0
    ? `+${velocity.toFixed(1)} pts/sem`
    : velocity < 0
    ? `${velocity.toFixed(1)} pts/sem`
    : 'sin datos'
  const velocityClass = velocity > 0
    ? 'text-success'
    : velocity < 0
    ? 'text-danger'
    : 'text-text-muted'

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [atRisk, setAtRisk] = useState<AtRiskItem[] | null>(null)
  const [atRiskLoading, setAtRiskLoading] = useState(false)

  const openAtRisk = useCallback(() => {
    setDrawerOpen(true)
  }, [])

  useEffect(() => {
    if (!drawerOpen || atRisk !== null || atRiskLoading) return
    setAtRiskLoading(true)
    fetch('/api/dashboard/at-risk')
      .then(r => r.json())
      .then(j => setAtRisk(j?.data?.items ?? []))
      .catch(() => setAtRisk([]))
      .finally(() => setAtRiskLoading(false))
  }, [drawerOpen, atRisk, atRiskLoading])

  const studyHref = data.weakest_domain_id
    ? `/study?domain=${data.weakest_domain_id}`
    : '/study'

  return (
    <Card className={cn('border-l-4', band.border)}>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-5">
            <Gauge score={data.score} low={data.confidence_low} high={data.confidence_high} />
            <div className="space-y-1">
              <div className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', band.bg, band.text)}>
                {band.label}
              </div>
              <h2 className="text-lg font-bold text-text-primary">Readiness Score</h2>
              <p className="text-xs text-text-muted">
                Cobertura: {coverage}% ({data.studied_concepts}/{data.total_concepts} conceptos)
              </p>
              <p className="text-xs">
                <span className="text-text-muted">P(aprobar) estimada: </span>
                <strong className={band.text}>{passPct}%</strong>
                <span className="text-text-muted"> · velocidad </span>
                <strong className={velocityClass}>{velocityLabel}</strong>
              </p>
              {eta && (
                <p className="text-xs text-text-secondary">
                  A tu ritmo, llegas al 80 alrededor del <strong>{eta}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[220px]">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                Tendencia 30 días
              </p>
              <div className={band.text}>
                <Sparkline series={data.history} />
              </div>
            </div>
            {data.weakest_domain && (
              <Link
                href={studyHref}
                className="block rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-3 py-2 text-xs"
              >
                <p className="text-text-muted">Empezar por</p>
                <p className="font-semibold text-text-primary">{data.weakest_domain}</p>
                {data.weakest_concepts.length > 0 && (
                  <p className="text-text-muted mt-0.5 line-clamp-1">
                    {data.weakest_concepts.map(c => c.name).join(' · ')}
                  </p>
                )}
                <p className="text-primary mt-1 font-medium">Repasar ahora →</p>
              </Link>
            )}
            {data.at_risk_count > 0 && (
              <button
                type="button"
                onClick={openAtRisk}
                className="w-full text-left rounded-lg bg-warning/10 hover:bg-warning/15 transition-colors px-3 py-2 text-xs text-warning"
              >
                <strong>{data.at_risk_count}</strong> conceptos en riesgo (7 días) →
              </button>
            )}
          </div>
        </div>

        {data.by_domain.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border space-y-2">
            {data.by_domain.map(d => (
              <div key={d.domain_id} className="flex items-center gap-3 text-xs">
                <span className="w-40 truncate text-text-secondary">{d.name}</span>
                <span className="text-text-muted w-10">{d.weight_percent}%</span>
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn('h-full', bandColor(d.score).bar)}
                    style={{ width: `${Math.max(2, d.score)}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-text-primary">
                  {Math.round(d.score)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Modal isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Conceptos en riesgo" size="lg">
        {atRiskLoading ? (
          <p className="text-sm text-text-muted">Cargando…</p>
        ) : !atRisk || atRisk.length === 0 ? (
          <p className="text-sm text-text-muted">No hay conceptos en riesgo ahora mismo.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {atRisk.map(c => {
              const due = c.nextReviewDate ? new Date(c.nextReviewDate) : null
              const dueLabel = due
                ? due.getTime() < Date.now()
                  ? 'Vencido'
                  : `En ${Math.max(1, Math.ceil((due.getTime() - Date.now()) / 86_400_000))}d`
                : ''
              return (
                <Link
                  key={c.conceptId}
                  href={`/study?concept=${c.slug}`}
                  className="block rounded-lg border border-border hover:border-primary/50 transition-colors px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                      <p className="text-xs text-text-muted truncate">
                        {c.domainName ?? '—'} · stability {c.stability.toFixed(1)}d
                        {c.lapses > 0 && ` · ${c.lapses} lapsos`}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-warning whitespace-nowrap">{dueLabel}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Modal>
    </Card>
  )
}
