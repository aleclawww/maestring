'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Clock,
  FileCheck,
} from 'lucide-react'
import { Card, Eyebrow, Button, BlurBlob } from '@/components/v2'

export default function ExamIntroPage() {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/exam/start', { method: 'POST' })
      const json = (await res.json().catch(() => ({}))) as {
        data?: { id?: string }
        error?: string
        message?: string
      }
      if (!res.ok) {
        console.error('ExamIntroPage start failed', {
          status: res.status,
          body: json,
        })
        setError(
          json.message ??
            json.error ??
            `Couldn't start the mock exam (HTTP ${res.status}).`,
        )
        return
      }
      if (!json.data?.id) {
        console.error('ExamIntroPage start returned malformed body', {
          status: res.status,
          body: json,
        })
        setError(
          "The server didn't return a valid exam session. Please try again.",
        )
        return
      }
      router.push(`/exam/${json.data.id}`)
    } catch (err) {
      console.error('ExamIntroPage start network error', err)
      setError(
        'Network error while starting the exam. Check your connection and try again.',
      )
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="relative isolate -mx-4 -my-8 overflow-hidden sm:-mx-6 sm:-my-10">
      <BlurBlob className="-left-32 -top-24" size={460} opacity={0.22} animated />
      <BlurBlob
        className="-right-40 top-32"
        background="var(--v2-gradient-brand-soft)"
        size={420}
        opacity={0.55}
      />

      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-[640px] items-center justify-center px-6 py-16">
        <Card padding="lg" tone="emphasized" className="w-full sm:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-gradient-brand text-white shadow-v2-button">
              <Award className="h-6 w-6" strokeWidth={2} />
            </div>
            <Eyebrow align="center" className="mt-5">
              SAA-C03 · Mock exam
            </Eyebrow>
            <h1 className="v2-display mt-3 text-[28px] sm:text-[36px]">
              The real conditions,{' '}
              <span className="v2-text-gradient">before the real exam.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[420px] text-[15px] leading-[1.65] text-v2-foreground-muted">
              A replica of the official exam under the same conditions. Server-
              timed; flag-for-review; submits automatically when time runs out.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { Icon: FileCheck, label: 'Questions', value: '65' },
              { Icon: Clock, label: 'Minutes', value: '130' },
              { Icon: Award, label: 'To pass', value: '720' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-v2-border bg-v2-surface p-4 text-center"
              >
                <s.Icon
                  className="mx-auto h-4 w-4 text-v2-foreground-subtle"
                  strokeWidth={2}
                />
                <p className="mt-2 v2-display text-[28px] leading-none text-v2-foreground">
                  {s.value}
                </p>
                <p className="mt-1.5 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <aside className="mt-7 flex gap-3 rounded-r-lg border-l-[3px] border-l-v2-warning bg-v2-warning-soft/60 p-4 text-left">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-v2-warning"
              strokeWidth={2.25}
            />
            <div>
              <p className="text-[13px] font-bold text-v2-foreground">
                Mock exam conditions
              </p>
              <ul className="mt-1.5 space-y-1 text-[12px] leading-[1.55] text-v2-foreground-muted">
                <li>· Timer is server-side — it doesn't pause on reload.</li>
                <li>· Submits automatically when time runs out.</li>
                <li>· Flag questions to revisit before submitting.</li>
              </ul>
            </div>
          </aside>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-v2-error/30 bg-v2-error-soft px-4 py-3 text-[13px] text-v2-error"
            >
              {error}
            </div>
          )}

          <Button
            onClick={start}
            disabled={starting}
            loading={starting}
            size="xl"
            className="mt-7 w-full"
          >
            {starting ? 'Starting…' : 'Start mock exam'}
            {!starting && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
          </Button>
        </Card>
      </div>
    </div>
  )
}
