/**
 * /preview/tokens — Corporate Trust design system showcase.
 *
 * Every later screen is built FROM these tokens. We lock the system here
 * before touching anything else (per build directive). The page itself uses
 * the tokens it documents — gradient text on the H1, colored shadows on the
 * cards, atmospheric blobs in the hero — so the system is also a self-demo.
 */
import Link from 'next/link'
import { Check, ArrowRight, AlertTriangle, AlertCircle, Award, Sparkles } from 'lucide-react'

const surfaces = [
  { name: 'background', value: '#F8FAFC', note: 'slate-50 — cool subtle base.' },
  { name: 'surface', value: '#FFFFFF', note: 'White cards, raised elements.' },
  { name: 'surface-subtle', value: '#F1F5F9', note: 'slate-100 — alt sections.' },
  { name: 'surface-sunken', value: '#E2E8F0', note: 'slate-200 — sunken panels.' },
]

const text = [
  { name: 'foreground', value: '#0F172A', note: 'slate-900 — high contrast headings.' },
  { name: 'foreground-muted', value: '#64748B', note: 'slate-500 — supporting text.' },
  { name: 'foreground-subtle', value: '#94A3B8', note: 'slate-400 — captions, meta.' },
]

const borders = [
  { name: 'border-subtle', value: '#F1F5F9' },
  { name: 'border', value: '#E2E8F0' },
  { name: 'border-strong', value: '#CBD5E1' },
]

const brand = [
  { name: 'brand', value: '#4F46E5', note: 'indigo-600 — primary.' },
  { name: 'brand-hover', value: '#4338CA' },
  { name: 'brand-soft', value: '#EEF2FF', note: 'indigo-50 — badge bg.' },
  { name: 'brand-soft-2', value: '#E0E7FF' },
]

const accent = [
  { name: 'accent', value: '#7C3AED', note: 'violet-600 — gradient partner.' },
  { name: 'accent-soft-2', value: '#EDE9FE' },
  { name: 'deep', value: '#312E81', note: 'indigo-900 — final CTA bg.' },
  { name: 'deep-darker', value: '#1E1B4B', note: 'indigo-950.' },
]

const semantic = [
  { name: 'success', value: '#10B981', soft: '#ECFDF5', Icon: Check },
  { name: 'warning', value: '#F59E0B', soft: '#FFFBEB', Icon: AlertTriangle },
  { name: 'error', value: '#EF4444', soft: '#FEF2F2', Icon: AlertCircle },
]

const typeScale = [
  { px: 12, label: 'caption / mono' },
  { px: 14, label: 'body sm / UI' },
  { px: 16, label: 'body' },
  { px: 18, label: 'lead' },
  { px: 20, label: 'card title' },
  { px: 24, label: 'h3' },
  { px: 30, label: 'h2 sm' },
  { px: 36, label: 'h2' },
  { px: 48, label: 'h1' },
  { px: 60, label: 'display' },
  { px: 72, label: 'hero' },
]

const radii = [
  { v: 6, use: 'pills, badges' },
  { v: 8, use: 'inputs, small buttons' },
  { v: 12, use: 'cards' },
  { v: 16, use: 'hero feature cards' },
  { v: 9999, use: 'avatars, pill buttons', label: 'full' },
]

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="h-px w-8 bg-v2-gradient-brand" />
      <span className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-brand">
        {children}
      </span>
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="v2-display mt-3 text-[36px] text-v2-foreground sm:text-[40px]">
      {children}
    </h2>
  )
}

function Section({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-v2-border-subtle py-20 sm:py-24">
      <Eyebrow>{eyebrow}</Eyebrow>
      <H2>{title}</H2>
      {intro && (
        <p className="mt-4 max-w-[640px] text-[16px] leading-[1.7] text-v2-foreground-muted">
          {intro}
        </p>
      )}
      <div className="mt-12">{children}</div>
    </section>
  )
}

function Swatch({
  name,
  value,
  note,
}: {
  name: string
  value: string
  note?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-v2-border bg-v2-surface shadow-v2-soft transition-all duration-200 ease-v2 hover:-translate-y-0.5 hover:shadow-v2-elevated">
      <div className="h-24 border-b border-v2-border" style={{ background: value }} />
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-v2-mono text-[13px] font-medium text-v2-foreground">
            {name}
          </span>
          <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
            {value}
          </span>
        </div>
        {note && (
          <p className="mt-1.5 text-[12px] leading-[1.5] text-v2-foreground-muted">
            {note}
          </p>
        )}
      </div>
    </div>
  )
}

export default function TokensPage() {
  return (
    <main className="relative isolate overflow-hidden">
      {/* Atmospheric blobs */}
      <div
        aria-hidden
        className="v2-blob -left-40 -top-32 h-[420px] w-[420px]"
        style={{ background: 'var(--v2-gradient-brand)', opacity: 0.18 }}
      />
      <div
        aria-hidden
        className="v2-blob -right-40 top-64 h-[360px] w-[360px]"
        style={{ background: 'var(--v2-gradient-brand-soft)', opacity: 0.5 }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pb-32 pt-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          <Link href="/preview" className="transition-colors hover:text-v2-foreground">
            Preview
          </Link>
          <span aria-hidden>/</span>
          <span className="text-v2-foreground">Tokens</span>
        </nav>

        {/* Hero */}
        <header className="mt-10 max-w-[820px]">
          <Eyebrow>Step 01 · Design System</Eyebrow>
          <h1 className="v2-display mt-4 text-[48px] text-v2-foreground sm:text-[60px] lg:text-[72px]">
            The grammar of{' '}
            <span className="v2-text-gradient">every other screen.</span>
          </h1>
          <p className="mt-6 max-w-[620px] text-[18px] leading-[1.6] text-v2-foreground-muted">
            Indigo to violet, colored shadows, isometric depth. The Corporate
            Trust aesthetic — professional yet approachable — encoded as
            tokens so every later component inherits it for free.
          </p>
        </header>

        {/* Surfaces */}
        <Section
          eyebrow="01 · Surfaces"
          title="Cool, calm, layered."
          intro="The base is slate-50, not pure white — that subtle warmth keeps the page from feeling clinical. Cards sit on top in solid white."
        >
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {surfaces.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
        </Section>

        {/* Text */}
        <Section
          eyebrow="02 · Text"
          title="A three-step ramp."
          intro="Slate-900 for headings (sharp, AAA contrast), slate-500 for supporting copy, slate-400 for captions and meta."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {text.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-v2-border bg-v2-surface p-6 shadow-v2-soft"
              >
                <p
                  style={{ color: t.value }}
                  className="text-[24px] font-bold leading-[1.2]"
                >
                  The quick brown fox.
                </p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="font-v2-mono text-[13px] font-medium">{t.name}</span>
                  <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                    {t.value}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-v2-foreground-muted">{t.note}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Brand + accent */}
        <Section
          eyebrow="03 · Brand & accent"
          title="Indigo + violet. The signature."
          intro="Indigo-600 is the brand. Violet-600 is its gradient partner — together they form the visual DNA of the system, used in CTAs, gradient text, and atmospheric blobs."
        >
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {brand.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-4">
            {accent.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>

          {/* Gradient demos */}
          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="overflow-hidden rounded-xl border border-v2-border bg-v2-surface shadow-v2-soft">
              <div className="h-32 bg-v2-gradient-brand" />
              <div className="p-4">
                <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-muted">
                  gradient-brand
                </p>
                <p className="mt-1 text-[13px] text-v2-foreground-muted">
                  Buttons, active states, atmospheric orbs.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-v2-border bg-v2-surface shadow-v2-soft">
              <div className="h-32 bg-v2-gradient-brand-soft" />
              <div className="p-4">
                <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-muted">
                  gradient-brand-soft
                </p>
                <p className="mt-1 text-[13px] text-v2-foreground-muted">
                  Soft container backgrounds.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-v2-border bg-v2-surface shadow-v2-soft">
              <div className="h-32 bg-v2-gradient-deep" />
              <div className="p-4">
                <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-muted">
                  gradient-deep
                </p>
                <p className="mt-1 text-[13px] text-v2-foreground-muted">
                  Final CTA backgrounds, dramatic dark sections.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Borders */}
        <Section
          eyebrow="04 · Borders"
          title="Quiet separation."
          intro="Borders are the secondary depth cue (colored shadows are the primary). Three weights so dividers, defaults, and hover states are distinguishable."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {borders.map((b) => (
              <div
                key={b.name}
                className="rounded-xl bg-v2-surface p-6 shadow-v2-soft"
                style={{ border: `1px solid ${b.value}` }}
              >
                <div className="font-v2-mono text-[13px] font-medium text-v2-foreground">
                  {b.name}
                </div>
                <div className="mt-1 font-v2-mono text-[11px] text-v2-foreground-subtle">
                  {b.value}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Semantic */}
        <Section
          eyebrow="05 · Semantic"
          title="Success, warning, error."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {semantic.map((s) => (
              <div
                key={s.name}
                className="overflow-hidden rounded-xl border border-v2-border bg-v2-surface shadow-v2-soft"
              >
                <div className="flex h-28 items-center justify-center" style={{ background: s.soft }}>
                  <div
                    className="flex items-center gap-2"
                    style={{ color: s.value }}
                  >
                    <s.Icon strokeWidth={2} className="h-5 w-5" />
                    <span className="font-v2-mono text-[14px] font-semibold uppercase tracking-v2-wide">
                      {s.name}
                    </span>
                  </div>
                </div>
                <div className="border-t border-v2-border p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-v2-mono text-[13px]">solid</span>
                    <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                      {s.value}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-v2-mono text-[13px]">soft</span>
                    <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                      {s.soft}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section
          eyebrow="06 · Typography"
          title="Plus Jakarta Sans, all the way down."
          intro="Geometric sans with friendly rounded terminals — professional authority + modern warmth in one face. ExtraBold (800) for hero, Bold (700) for sections, SemiBold (600) for card titles, Regular (400) for body."
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Display sample */}
            <div className="rounded-xl border border-v2-border bg-v2-surface p-8 shadow-v2-soft">
              <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Display · 800 · -0.02em
              </p>
              <p className="v2-display mt-6 text-[72px] text-v2-foreground">
                Pass <span className="v2-text-gradient">first try.</span>
              </p>
              <p className="v2-display mt-4 text-[36px] font-bold text-v2-foreground">
                Section headline at 36px.
              </p>
              <p className="mt-3 text-[24px] font-semibold leading-[1.2] text-v2-foreground">
                Card title — SemiBold 24px.
              </p>
            </div>

            {/* Body & mono */}
            <div className="rounded-xl border border-v2-border bg-v2-surface p-8 shadow-v2-soft">
              <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Body · 400 · 1.6 line-height
              </p>
              <p className="mt-6 text-[18px] leading-[1.6] text-v2-foreground">
                Lead paragraph at 18px / 1.6. Used for hero subheads and section
                intros where breathing room outweighs density.
              </p>
              <p className="mt-4 text-[16px] leading-[1.7] text-v2-foreground-muted">
                Body text at 16px / 1.7. Default for marketing prose. We hold line
                length to 60–75 characters — past 80 the eye loses its place
                between line ends.
              </p>
              <p className="mt-4 text-[14px] leading-[1.5] text-v2-foreground-muted">
                UI label at 14px — used inside the dashboard.
              </p>
              <p className="mt-8 font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                JetBrains Mono
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['SAA-C03', 'DVA-C02', 'SOA-C02', 'SAP-C02', 'MLA-C01'].map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-2 py-1 font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Type scale */}
          <div className="mt-12 overflow-hidden rounded-xl border border-v2-border bg-v2-surface shadow-v2-soft">
            <div className="border-b border-v2-border-subtle bg-v2-surface-subtle px-6 py-3">
              <span className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-muted">
                Type scale · Major Third (1.250)
              </span>
            </div>
            <div className="divide-y divide-v2-border-subtle">
              {typeScale.map((t) => (
                <div key={t.px} className="flex items-baseline gap-6 px-6 py-4">
                  <span className="w-16 font-v2-mono text-[12px] text-v2-foreground-subtle">
                    {t.px}px
                  </span>
                  <span className="w-32 font-v2-mono text-[12px] text-v2-foreground-muted">
                    {t.label}
                  </span>
                  <span
                    className="font-bold tracking-v2-display text-v2-foreground"
                    style={{ fontSize: `${t.px}px`, lineHeight: 1.15 }}
                  >
                    Maestring
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Spacing & radii */}
        <Section
          eyebrow="07 · Spacing & radii"
          title="4px base. Generous rhythm."
          intro="Sections breathe at py-16 mobile / py-24 desktop. Containers cap at max-w-7xl. Radii scale from 6px (badges) up to rounded-full (pill buttons, avatars)."
        >
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="rounded-xl border border-v2-border bg-v2-surface p-8 shadow-v2-soft">
              <h3 className="text-[20px] font-bold text-v2-foreground">Spacing scale</h3>
              <p className="mt-1 text-[13px] text-v2-foreground-muted">
                4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96
              </p>
              <div className="mt-5 space-y-3">
                {[4, 8, 12, 16, 24, 32, 48, 64, 96].map((px) => (
                  <div key={px} className="flex items-center gap-4">
                    <span className="w-10 font-v2-mono text-[12px] text-v2-foreground-subtle">
                      {px}
                    </span>
                    <div
                      className="h-3 rounded-sm bg-v2-gradient-brand"
                      style={{ width: `${px}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-v2-border bg-v2-surface p-8 shadow-v2-soft">
              <h3 className="text-[20px] font-bold text-v2-foreground">Radii</h3>
              <p className="mt-1 text-[13px] text-v2-foreground-muted">
                Cards get 12. Hero cards 16. Buttons can be 8 or full.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {radii.map((r) => (
                  <div
                    key={r.v}
                    className="flex h-28 flex-col items-center justify-center border border-v2-border bg-v2-surface-subtle"
                    style={{ borderRadius: r.v === 9999 ? 9999 : r.v }}
                  >
                    <span className="font-v2-mono text-[14px] font-semibold text-v2-foreground">
                      {r.label ?? `${r.v}px`}
                    </span>
                    <span className="mt-1 px-2 text-center text-[11px] text-v2-foreground-muted">
                      {r.use}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Shadows */}
        <Section
          eyebrow="08 · Colored shadows"
          title="Indigo-tinted, never neutral gray."
          intro="Soft shadows in the brand palette reinforce the visual signature. Cards rest on shadow-soft, lift to shadow-elevated on hover, primary buttons live on shadow-button."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'shadow-soft', cls: 'shadow-v2-soft', desc: 'Default card elevation.' },
              { name: 'shadow-elevated', cls: 'shadow-v2-elevated', desc: 'Hover state on cards.' },
              { name: 'shadow-button', cls: 'shadow-v2-button bg-v2-gradient-brand text-white', desc: 'Primary CTAs.' },
              { name: 'shadow-glow', cls: 'shadow-v2-glow bg-v2-brand text-white', desc: 'Numbered badges, accents.' },
            ].map((s) => (
              <div
                key={s.name}
                className={`flex h-44 flex-col justify-between rounded-xl border border-v2-border p-5 ${s.cls}`}
                style={s.cls.includes('bg-') ? {} : { background: 'var(--v2-surface)' }}
              >
                <span
                  className={`font-v2-mono text-[12px] uppercase tracking-v2-wide ${
                    s.cls.includes('text-white')
                      ? 'text-white/80'
                      : 'text-v2-foreground-subtle'
                  }`}
                >
                  {s.name}
                </span>
                <span
                  className={`text-[13px] ${
                    s.cls.includes('text-white') ? 'text-white' : 'text-v2-foreground-muted'
                  }`}
                >
                  {s.desc}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Motion */}
        <Section
          eyebrow="09 · Motion"
          title="200ms ease-out. Refined, never jarring."
          intro="Cards lift, buttons drift up, arrows slide right — small, deliberate gestures that reinforce affordance without becoming choreography."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="group cursor-pointer rounded-xl border border-v2-border bg-v2-surface p-6 shadow-v2-soft transition-all duration-200 ease-v2 hover:-translate-y-1 hover:shadow-v2-elevated">
              <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-brand">
                Card hover
              </p>
              <p className="mt-3 text-[15px] leading-[1.5] text-v2-foreground">
                Translates 4px up. Shadow deepens from soft to elevated.
              </p>
              <p className="mt-2 text-[13px] text-v2-foreground-subtle">Hover this →</p>
            </div>

            <button className="group rounded-xl bg-v2-gradient-brand p-6 text-left text-white shadow-v2-button transition-all duration-200 ease-v2 hover:-translate-y-0.5 hover:shadow-v2-elevated">
              <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-white/80">
                Button hover
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-[15px] font-semibold">
                Subtle 2px lift
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 ease-v2 group-hover:translate-x-1"
                  strokeWidth={2.5}
                />
              </p>
              <p className="mt-2 text-[13px] text-white/70">Hover this →</p>
            </button>

            <div className="rounded-xl border border-v2-border bg-v2-surface p-6 shadow-v2-soft">
              <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Easing
              </p>
              <p className="mt-3 font-v2-mono text-[13px] text-v2-foreground">
                cubic-bezier(0.16, 1, 0.3, 1)
              </p>
              <p className="mt-3 text-[13px] leading-[1.6] text-v2-foreground-muted">
                Snappy in, settles out. 200ms is the default; 500ms reserved for
                image zooms and hero choreography.
              </p>
            </div>
          </div>
        </Section>

        {/* Bold choices: isometric + glow + soft icon containers */}
        <Section
          eyebrow="10 · Signature moves"
          title="The bold, deliberate choices."
          intro="Three things stop the system from looking like every other Tailwind landing: isometric tilt on hero artifacts, atmospheric blur orbs, and gradient-ringed glow badges."
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Isometric card sample */}
            <div className="rounded-xl border border-v2-border bg-v2-surface-subtle p-8" style={{ perspective: '2000px' }}>
              <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Isometric tilt
              </p>
              <div
                className="mx-auto mt-8 w-full max-w-[240px] rounded-2xl border border-v2-border bg-v2-surface p-5 shadow-v2-elevated transition-transform duration-500 ease-v2 hover:rotate-y-[-8deg]"
                style={{ transform: 'rotateX(5deg) rotateY(-12deg)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                    SAA-C03
                  </span>
                  <span className="rounded-full bg-v2-success-soft px-2 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-success">
                    Due
                  </span>
                </div>
                <p className="mt-4 text-[14px] font-semibold leading-[1.4] text-v2-foreground">
                  Which storage class is most cost-effective for archival?
                </p>
                <div className="mt-3 h-1 w-full rounded-full bg-v2-surface-sunken">
                  <div className="h-full w-2/3 rounded-full bg-v2-gradient-brand" />
                </div>
              </div>
              <p className="mt-8 text-center text-[12px] text-v2-foreground-muted">
                rotateX(5deg) rotateY(-12deg) — hover to settle
              </p>
            </div>

            {/* Glow badge */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-v2-border bg-v2-surface p-8 shadow-v2-soft">
              <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Glow badge
              </p>
              <div className="mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-v2-gradient-brand text-white shadow-v2-glow">
                <Award strokeWidth={2} className="h-9 w-9" />
              </div>
              <p className="mt-8 text-center text-[12px] text-v2-foreground-muted">
                shadow-v2-glow on a gradient bg
              </p>
            </div>

            {/* Soft icon container */}
            <div className="rounded-xl border border-v2-border bg-v2-surface p-8 shadow-v2-soft">
              <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Soft icon containers
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { Icon: Sparkles, color: 'brand' as const },
                  { Icon: Award, color: 'accent' as const },
                  { Icon: Check, color: 'success' as const },
                ].map(({ Icon, color }, i) => (
                  <div
                    key={i}
                    className="flex h-14 w-full items-center justify-center rounded-xl"
                    style={{
                      background:
                        color === 'brand'
                          ? 'var(--v2-brand-soft)'
                          : color === 'accent'
                          ? 'var(--v2-accent-soft-2)'
                          : 'var(--v2-success-soft)',
                      color:
                        color === 'brand'
                          ? 'var(--v2-brand)'
                          : color === 'accent'
                          ? 'var(--v2-accent)'
                          : 'var(--v2-success)',
                    }}
                  >
                    <Icon strokeWidth={2} className="h-5 w-5" />
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[12px] text-v2-foreground-muted">
                12-color soft container for feature icons. Pair with brand-tinted
                backgrounds for hierarchy without weight.
              </p>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <footer className="mt-24 flex flex-col items-start justify-between gap-4 border-t border-v2-border-subtle pt-10 sm:flex-row sm:items-center">
          <p className="text-[13px] text-v2-foreground-subtle">
            End of Step 01 — approve in chat to advance.
          </p>
          <Link
            href="/preview"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-v2-brand hover:text-v2-brand-hover"
          >
            ← Back to preview index
          </Link>
        </footer>
      </div>
    </main>
  )
}
