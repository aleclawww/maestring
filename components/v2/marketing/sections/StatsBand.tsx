/**
 * Spec band — full-bleed section on the deep gradient.
 *
 * Originally fake user-outcome metrics (94% pass rate, 3,200+ students).
 * Replaced with verifiable product specs that don't depend on social proof:
 * question count, lab count, certs covered, exam-guide alignment.
 */

const SPECS: Array<{ value: string; suffix?: string; label: string }> = [
  { value: '1,800', suffix: '+', label: 'exam-style questions' },
  { value: '40', suffix: '+', label: 'hands-on AWS labs' },
  { value: '6', label: 'certifications covered' },
  { value: '2026', label: 'exam-guide aligned' },
]

export function StatsBand() {
  return (
    <section className="relative overflow-hidden bg-v2-gradient-deep py-20 sm:py-24 lg:py-28">
      {/* Subtle decorative orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="max-w-[640px]">
          <div className="inline-flex items-center gap-2">
            <span aria-hidden className="h-px w-8 bg-white/40" />
            <span className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-white/70">
              What's in the box
            </span>
          </div>
          <h2 className="v2-display mt-3 text-[36px] text-white sm:text-[44px] lg:text-[52px]">
            The product, in{' '}
            <span
              style={{
                background:
                  'linear-gradient(135deg, #C4B5FD 0%, #FBCFE8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              checkable numbers.
            </span>
          </h2>
          <p className="mt-4 max-w-[480px] text-[16px] leading-[1.7] text-white/70">
            Specs you can verify on day one — no claims about pass rates we
            can't show you the spreadsheet for.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4">
          {SPECS.map((s) => (
            <div key={s.label}>
              <div className="flex items-baseline">
                <span className="font-v2-display text-[56px] font-extrabold leading-none tracking-v2-display text-white sm:text-[64px] lg:text-[72px]">
                  {s.value}
                </span>
                {s.suffix && (
                  <span
                    className="ml-1 font-v2-display text-[28px] font-bold leading-none sm:text-[32px] lg:text-[36px]"
                    style={{
                      background:
                        'linear-gradient(135deg, #C4B5FD 0%, #FBCFE8 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {s.suffix}
                  </span>
                )}
              </div>
              <p className="mt-3 text-[14px] font-medium text-white/70">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
