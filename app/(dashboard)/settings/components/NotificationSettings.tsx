'use client'

import { useState } from 'react'

interface NotificationSettingsProps {
  userId: string
  studyMinutesPerDay: number
}

export function NotificationSettings({ studyMinutesPerDay: initial }: NotificationSettingsProps) {
  const [mins, setMins] = useState(initial)
  const [emailNudges, setEmailNudges] = useState(true)

  return (
    <section>
      <h2 className="text-sm font-semibold text-text-primary mb-4 pb-2 border-b border-border">
        Notificaciones y Estudio
      </h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-text-secondary mb-2 block">
            Minutos de estudio al día: <span className="text-text-primary font-bold">{mins}</span>
          </label>
          <input
            type="range"
            min={10}
            max={120}
            step={10}
            value={mins}
            onChange={e => setMins(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>10 min</span>
            <span>2 horas</span>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={emailNudges}
            onChange={e => setEmailNudges(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">Recordatorios por email</p>
            <p className="text-xs text-text-muted">
              Recibirás un email cuando tengas conceptos vencidos y no hayas estudiado hoy.
            </p>
          </div>
        </label>
      </div>
    </section>
  )
}
