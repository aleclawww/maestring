/**
 * /preview/kitchen-sink — every v2 primitive in every state.
 *
 * Goal: a designer or engineer can scan this page and see exactly what each
 * component looks like across its variants, so when they grab one in a real
 * screen they know what they're getting.
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Search,
  Mail,
  Lock,
  Sparkles,
  Award,
  Flame,
  Github,
  Zap,
} from 'lucide-react'
import {
  Button,
  Input,
  Textarea,
  Field,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Pill,
  Eyebrow,
  Logo,
  BlurBlob,
} from '@/components/v2'

function Section({
  num,
  title,
  description,
  children,
}: {
  num: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-v2-border-subtle py-16">
      <div className="mb-10 max-w-[640px]">
        <Eyebrow>{num}</Eyebrow>
        <h2 className="v2-display mt-3 text-[32px] text-v2-foreground sm:text-[36px]">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-[15px] leading-[1.7] text-v2-foreground-muted">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-4 border-t border-v2-border-subtle py-6 sm:grid-cols-[160px_1fr]">
      <span className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function KitchenSinkPage() {
  const [email, setEmail] = React.useState('')
  const [pw, setPw] = React.useState('hunter2')
  const [bio, setBio] = React.useState('')
  const [showError, setShowError] = React.useState(false)

  return (
    <main className="relative isolate overflow-hidden">
      <BlurBlob className="-left-40 -top-32" size={420} opacity={0.18} />
      <BlurBlob
        className="-right-40 top-96"
        background="var(--v2-gradient-brand-soft)"
        size={360}
        opacity={0.5}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pb-32 pt-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          <Link href="/preview" className="transition-colors hover:text-v2-foreground">
            Preview
          </Link>
          <span aria-hidden>/</span>
          <span className="text-v2-foreground">Kitchen sink</span>
        </nav>

        {/* Hero */}
        <header className="mt-10 max-w-[820px]">
          <Eyebrow>Step 02 · Primitives</Eyebrow>
          <h1 className="v2-display mt-4 text-[48px] text-v2-foreground sm:text-[60px]">
            Every component,{' '}
            <span className="v2-text-gradient">every state.</span>
          </h1>
          <p className="mt-5 max-w-[560px] text-[17px] leading-[1.6] text-v2-foreground-muted">
            Buttons, inputs, cards, badges, the wordmark. The atoms that compose
            every later screen — sized for accessibility, gradient where it
            counts, quiet everywhere else.
          </p>
        </header>

        {/* Logo */}
        <Section
          num="01 · Logo"
          title="Wordmark + gradient dot."
          description="The dot is the brand's only graphic mark. Three sizes cover nav, auth header, and sidebar."
        >
          <Card padding="lg" className="space-y-8">
            <Row label="Nav (22px)">
              <Logo size={22} asLink={false} />
            </Row>
            <Row label="Auth (32px)">
              <Logo size={32} asLink={false} />
            </Row>
            <Row label="Hero (48px)">
              <Logo size={48} asLink={false} />
            </Row>
            <Row label="On dark surface">
              <div className="rounded-lg bg-v2-gradient-deep px-6 py-4">
                <Logo size={28} asLink={false} className="text-white" />
              </div>
            </Row>
          </Card>
        </Section>

        {/* Buttons */}
        <Section
          num="02 · Buttons"
          title="Five variants. Four sizes."
          description="Primary is the gradient signature — used sparingly, only for the most important action on a screen. Secondary is the workhorse."
        >
          <Card padding="lg" className="divide-y divide-v2-border-subtle">
            <Row label="Primary">
              <Button>Get started</Button>
              <Button>
                Continue
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Button>
              <Button size="pill">Pill primary</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </Row>
            <Row label="Secondary">
              <Button variant="secondary">Cancel</Button>
              <Button variant="secondary">
                <Github className="h-4 w-4" strokeWidth={2} />
                Continue with GitHub
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </Row>
            <Row label="Dark">
              <Button variant="dark">Sign in</Button>
              <Button variant="dark" size="lg">
                View pricing
              </Button>
            </Row>
            <Row label="Ghost">
              <Button variant="ghost">Learn more</Button>
              <Button variant="ghost" size="sm">
                Skip
              </Button>
            </Row>
            <Row label="Link">
              <Button variant="link">Forgot password?</Button>
              <Button variant="link">
                See changelog
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Button>
            </Row>
            <Row label="Sizes">
              <Button size="sm">Small (h-8)</Button>
              <Button size="md">Medium (h-10)</Button>
              <Button size="lg">Large (h-11)</Button>
              <Button size="xl">Extra large (h-12)</Button>
            </Row>
            <Row label="Icon-only">
              <Button size="icon" aria-label="Search">
                <Search className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button size="icon" variant="secondary" aria-label="Upgrade">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Achievements">
                <Award className="h-4 w-4" strokeWidth={2} />
              </Button>
            </Row>
          </Card>
        </Section>

        {/* Inputs */}
        <Section
          num="03 · Inputs"
          title="Labels above. Focus rings outside."
          description="Forty-pixel height matches the lg button — they line up on the same row in auth and signup."
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Default states</CardTitle>
                <CardDescription>
                  Click into a field to see the focus ring.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field
                  label="Email"
                  htmlFor="ks-email"
                  hint="We'll never share it."
                >
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Password" htmlFor="ks-pw" required>
                  <Input
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                  />
                </Field>
                <Field label="Bio" htmlFor="ks-bio">
                  <Textarea
                    placeholder="Tell us about your AWS journey…"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader>
                <CardTitle>Edge states</CardTitle>
                <CardDescription>
                  Error, disabled, with-icon — all from the same primitive.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field
                  label="Email"
                  htmlFor="ks-error"
                  error={showError ? "We don't recognize this address." : undefined}
                >
                  <Input
                    type="email"
                    invalid={showError}
                    defaultValue="not-a-real@user"
                  />
                </Field>
                <Field label="Disabled field" htmlFor="ks-disabled">
                  <Input disabled defaultValue="locked@company.com" />
                </Field>
                {/* Icon-prefixed input — composed from primitives, no new variant */}
                <Field label="Search" htmlFor="ks-search">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v2-foreground-subtle"
                      strokeWidth={2}
                    />
                    <Input
                      placeholder="Search lessons, services, exam topics…"
                      className="pl-9"
                    />
                  </div>
                </Field>
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowError((v) => !v)}
                  >
                    Toggle error state
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Cards */}
        <Section
          num="04 · Cards"
          title="Four tones. Hover lifts."
          description="Default carries shadow-soft. Emphasized scales up with a brand ring — used for the highlighted pricing tier. Dark uses the gradient-deep band."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <Badge tone="brand" mono size="sm">
                  Default
                </Badge>
                <CardTitle>Soft elevation</CardTitle>
                <CardDescription>
                  Used for feature cards, lesson rows, and dashboard tiles.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="link">
                  Read more
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </Button>
              </CardFooter>
            </Card>

            <Card interactive>
              <CardHeader>
                <Badge tone="brand" mono size="sm">
                  Interactive
                </Badge>
                <CardTitle>Lifts on hover</CardTitle>
                <CardDescription>
                  Hover this card — translates 4px up, shadow deepens.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                  Try it →
                </span>
              </CardFooter>
            </Card>

            <Card tone="emphasized">
              <CardHeader>
                <Pill tone="gradient" size="md">
                  <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                  Most popular
                </Pill>
                <CardTitle>Highlighted tier</CardTitle>
                <CardDescription>
                  Brand ring + soft elevation. Reserved for the centre pricing
                  card.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button size="sm">Choose plan</Button>
              </CardFooter>
            </Card>

            <Card tone="dark">
              <CardHeader>
                <Badge tone="gradient" size="sm">
                  CTA
                </Badge>
                <CardTitle className="text-white">Dark gradient</CardTitle>
                <CardDescription className="text-white/70">
                  Final CTAs and stat bands. Inverts the system's polarity for
                  emphasis.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="secondary" size="sm">
                  Start free
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Feature card with soft icon */}
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                Icon: Zap,
                title: 'Adaptive AI',
                desc: 'Generates exam-style questions tuned to the gaps the FSRS engine surfaces.',
              },
              {
                Icon: Flame,
                title: 'Streak-driven',
                desc: 'Daily review windows match the way memory actually consolidates.',
              },
              {
                Icon: Award,
                title: 'Mock exams',
                desc: 'Identical to the official AWS UI — same timer, same flag-for-review.',
              },
            ].map((f, i) => (
              <Card key={i} interactive>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
                  <f.Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <CardHeader className="mt-5">
                  <CardTitle>{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </Section>

        {/* Badges & Pills */}
        <Section
          num="05 · Badges & pills"
          title="Status, codes, eyebrows."
          description="Mono uppercase for codes (SAA-C03, ASSOCIATE). Sentence case for human-friendly labels (Most popular, New)."
        >
          <Card padding="lg" className="divide-y divide-v2-border-subtle">
            <Row label="Tones">
              <Badge tone="neutral">Neutral</Badge>
              <Badge tone="brand">Brand</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="success">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Passed
              </Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="error">Error</Badge>
              <Badge tone="gradient">Gradient</Badge>
              <Badge tone="dark">Dark</Badge>
            </Row>
            <Row label="Mono / cert codes">
              <Badge tone="brand" mono size="sm">
                SAA-C03
              </Badge>
              <Badge tone="brand" mono size="md">
                DVA-C02
              </Badge>
              <Badge tone="brand" mono size="lg">
                SAP-C02
              </Badge>
              <Badge tone="neutral" mono>
                Associate
              </Badge>
              <Badge tone="accent" mono>
                Specialty
              </Badge>
            </Row>
            <Row label="Pills">
              <Pill tone="neutral">
                <span className="h-1.5 w-1.5 rounded-full bg-v2-success" />
                7-day streak
              </Pill>
              <Pill tone="brand">
                <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                New: 2026 question bank
              </Pill>
              <Pill tone="gradient">
                <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                Most popular
              </Pill>
              <Pill tone="outlined" size="lg">
                Beta access
              </Pill>
            </Row>
            <Row label="Eyebrow (section accent)">
              <Eyebrow>How it works</Eyebrow>
              <span className="text-v2-foreground-subtle">·</span>
              <Eyebrow>Pricing</Eyebrow>
              <span className="text-v2-foreground-subtle">·</span>
              <Eyebrow>Trusted by 3,200+ engineers</Eyebrow>
            </Row>
          </Card>
        </Section>

        {/* Live form combo */}
        <Section
          num="06 · Composition"
          title="A real auth form, end to end."
          description="The same primitives, composed. Drop this directly into the auth screen later."
        >
          <Card
            padding="lg"
            className="mx-auto max-w-[480px] sm:p-10"
          >
            <div className="flex flex-col items-center text-center">
              <Logo size={28} asLink={false} />
              <h3 className="v2-display mt-6 text-[28px] text-v2-foreground">
                Welcome back
              </h3>
              <p className="mt-1.5 text-[14px] text-v2-foreground-muted">
                Sign in to keep your streak alive.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Button variant="secondary" size="lg" className="w-full">
                <Github className="h-4 w-4" strokeWidth={2} />
                Continue with GitHub
              </Button>
              <Button variant="secondary" size="lg" className="w-full">
                <Mail className="h-4 w-4" strokeWidth={2} />
                Continue with Google
              </Button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-v2-border" />
              <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Or with email
              </span>
              <div className="h-px flex-1 bg-v2-border" />
            </div>

            <div className="space-y-4">
              <Field label="Email" htmlFor="auth-email">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  defaultValue=""
                />
              </Field>
              <Field label="Password" htmlFor="auth-pw">
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v2-foreground-subtle"
                    strokeWidth={2}
                  />
                  <Input type="password" className="pl-9" />
                </div>
              </Field>
              <Button size="lg" className="w-full">
                Sign in
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Button>
            </div>

            <p className="mt-6 text-center text-[13px] text-v2-foreground-muted">
              No account?{' '}
              <Button variant="link" className="text-[13px]">
                Create one — it's free
              </Button>
            </p>
          </Card>
        </Section>

        {/* Footer */}
        <footer className="mt-16 flex items-center justify-between border-t border-v2-border-subtle pt-8">
          <p className="text-[13px] text-v2-foreground-subtle">
            End of Step 02 — approve to advance to landing.
          </p>
          <Link
            href="/preview"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-v2-brand hover:text-v2-brand-hover"
          >
            ← Back to index
          </Link>
        </footer>
      </div>
    </main>
  )
}
