import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export interface ReadinessData {
  score: number
  by_domain: Array<{
    domain_id: string
    name: string
    weight_percent: number
    score: number
    concepts: number
    studied: number
  }>
  weakest_domain: string | null
  at_risk_count: number
  total_concepts: number
  studied_concepts: number
  eta_ready_date: string | null
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

function Gauge({ score }: { score: number }) {
  // Half-circle SVG gauge. Radius 80, viewBox 200x110.
  const r = 80
  const circ = Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  const dash = circ * pct
  const band = bandColor(score)
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
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="14"
          className={band.ring}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className={cn('text-4xl font-bold leading-none', band.text)}>
          {Math.round(score)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
          / 100
        </span>
      </div>
    </div>
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

  return (
    <Card className={cn('border-l-4', band.border)}>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-5">
            <Gauge score={data.score} />
            <div className="space-y-1">
              <div className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', band.bg, band.text)}>
                {band.label}
              </div>
              <h2 className="text-lg font-bold text-text-primary">Readiness Score</h2>
              <p className="text-xs text-text-muted">
                Cobertura: {coverage}% ({data.studied_concepts}/{data.total_concepts} conceptos)
              </p>
              {eta && (
                <p className="text-xs text-text-secondary">
                  A tu ritmo, llegas al 80 alrededor del <strong>{eta}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm min-w-[200px]">
            {data.weakest_domain && (
              <div>
                <p className="text-xs text-text-muted">Dominio más débil</p>
                <p className="font-semibold text-text-primary">{data.weakest_domain}</p>
              </div>
            )}
            {data.at_risk_count > 0 && (
              <div className="rounded bg-warning/10 px-3 py-2 text-warning text-xs">
                <strong>{data.at_risk_count}</strong> conceptos en riesgo de olvido en los próximos 7 días
              </div>
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
    </Card>
  )
}
