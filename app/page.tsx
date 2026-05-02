import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Maestring — Phase-Orchestrated AWS Certification Prep",
  description:
    "Pass the AWS Solutions Architect Associate exam faster with a 9-phase cognitive learning engine, FSRS spaced repetition, and live readiness scoring across 142 concepts.",
  // Explicit canonical on the homepage reinforces to Google which URL owns
  // this domain — a prerequisite for the favicon appearing in search results.
  alternates: {
    canonical: 'https://maestring.com',
  },
  openGraph: {
    url: 'https://maestring.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

const FEATURES = [
  {
    icon: "🧭",
    title: "9-Phase Coach (Gemelo Digital)",
    desc: "An orchestrator decides what you do each session — Calibration → Ambient → Anchoring → Retrieval → Interleaving → Consolidation → Automation → Transfer → Mastery. Not a quiz dump. A pedagogically-sequenced system.",
  },
  {
    icon: "🔄",
    title: "FSRS-4.5 Spaced Repetition",
    desc: "The state-of-the-art open-source algorithm schedules each of your 142 concepts at the optimal moment — right before you would have forgotten.",
  },
  {
    icon: "🧪",
    title: "Cognitive Fingerprint",
    desc: "5-minute calibration measures your working-memory span (n-back), reaction time, chronotype, and sleep window. The Coach uses this to decide what activity, when — and blocks you from cramming inside your sleep window.",
  },
  {
    icon: "🗺️",
    title: "Knowledge Map",
    desc: "Every one of the 142 SAA-C03 concepts shown as a coloured tile: Mastered / Proficient / Familiar / Learning / Not seen. Scan your gaps in 3 seconds.",
  },
  {
    icon: "📊",
    title: "Live Readiness Score",
    desc: "A single number 0-100 that predicts your pass probability across the four official domains: Secure (30%), Resilient (26%), High-Performing (24%), Cost-Optimized (20%).",
  },
  {
    icon: "🎯",
    title: "65-Question Mock Exam",
    desc: "Full-length timed simulator with question flagging and per-task breakdowns. Use it as the final checkpoint after the Coach moves you to the Transfer phase.",
  },
  {
    icon: "🃏",
    title: "Flashcards + Self-Rate",
    desc: "Quick-recall drills built from the knowledge graph. Mark concepts you already know to skip ahead — the FSRS state respects you.",
  },
  {
    icon: "🤔",
    title: "Confidence Calibration",
    desc: "Rate your confidence (1-5) before each reveal. The system tracks your overconfidence per domain and won't let you advance to Mastery until your metacognition is honest.",
  },
  {
    icon: "🛡️",
    title: "Forgetting Bounce-Back",
    desc: "If your readiness drops more than 20 points in 7 days, the Coach automatically pulls you back to Consolidation. You can't fake progress here.",
  },
];

type Testimonial = {
  id: string;
  display_name: string;
  role: string | null;
  content: string;
  stars: number;
  exam_passed: boolean | null;
  scaled_score: number | null;
};

async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const supabase = createAdminClient();
    // Landing-page testimonial section is gated on this list being non-empty
    // (no fake fallback — FTC truth-in-advertising). A silent read failure
    // here hid the entire social-proof section from every visitor while
    // revalidate=600 held the cached empty state for 10 minutes. The
    // try/catch below only catches throws; Supabase surfaces read errors
    // as `{ data: null, error }`, which fell straight through. Log warn so
    // a broken RLS or connection gets attributed correctly instead of
    // being blamed on "no approved testimonials yet".
    const { data, error: testimonialsErr } = await supabase
      .from("testimonials")
      .select("id, display_name, role, content, stars, exam_passed, scaled_score, featured, submitted_at")
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(6);
    if (testimonialsErr) {
      logger.warn(
        { err: testimonialsErr },
        "landing: failed to read approved testimonials — social-proof section hidden (revalidate=600 caches this state for 10min)"
      );
    }
    return (data ?? []) as Testimonial[];
  } catch (err) {
    // Throw path — createAdminClient() boot or network failure. Log so
    // a boot-time misconfig (missing SUPABASE_SERVICE_ROLE_KEY, etc.) isn't
    // silently absorbed as "no testimonials".
    logger.warn({ err }, "landing: getTestimonials threw — section hidden");
    return [];
  }
}

const FAQS = [
  {
    q: "What exam does Maestring currently cover?",
    a: "AWS Solutions Architect Associate (SAA-C03). 142 concepts mapped to the official v1.1 exam guide — the four domains, every task statement, every in-scope service. Developer Associate, SysOps, and Professional tiers will follow.",
  },
  {
    q: "Is this just another question dump?",
    a: "No. The differentiator is the orchestrator: a 9-phase engine that decides what you do each session based on your cognitive fingerprint and FSRS state. You don't pick the activity — the system picks for you. Calibration, ambient exposure, open-ended generation, easy retrieval, interleaving, consolidation, timed automation drills, multi-concept transfer, and long-term mastery maintenance.",
  },
  {
    q: "How are the questions generated?",
    a: "From a deterministic exam-pattern engine. 142 concepts × 5 question types (scenario, true-fact, false-fact, when-to-use, comparison) × 4–6 wording templates × randomised correct-answer position = 12,000+ unique questions, all pre-generated and instantly served. Zero LLM cost, zero latency, no per-day quota even on the free plan.",
  },
  {
    q: "Do I still need AWS Skill Builder?",
    a: "Yes — keep it. Skill Builder is the authoritative source for AWS content and official labs. Maestring is the adaptive exam-readiness layer on top: it tells you when you're actually ready to pass, something AWS can't do for you (AWS is paid when you sit the exam; we're paid when you pass it). Most of our users run both.",
  },
  {
    q: "How does Maestring compare to the official AWS practice exam?",
    a: "The official practice exam is a single 20-question set — useful once, not repeatable. Maestring gives you 2,000+ pre-generated questions across all 142 concepts, FSRS spaced repetition, a live Readiness Score, and a 65-question mock exam. Use the official practice as a final checkpoint; use Maestring to get there.",
  },
  {
    q: "What's the cognitive fingerprint?",
    a: "A 5-minute one-time calibration: a digit-span n-back test for working memory, a 5-trial reaction-time test for processing speed, plus your chronotype, sleep window, and cognitive load budget. The Coach uses this to pick the right activity for the right moment — and refuses to serve you a hard drill at 3am if you said you sleep at 23:00.",
  },
  {
    q: "How does the 7-day free trial work?",
    a: "Click Start trial, enter your card on Stripe (PCI-compliant — we never see it), get instant Pro access for 7 days at $0. We email you 3 days before the trial ends. If you cancel any time in those 7 days, you're charged nothing — ever. If you don't cancel, $19 is charged on day 8 and your monthly subscription begins. If your card fails on day 8, the subscription cancels cleanly (no past-due chasing).",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No lock-ins, no dark patterns. Cancel from Settings → Billing at any time and you keep access until the end of your billing period (or, during the trial, immediately with no charge).",
  },
  {
    q: "Is my progress saved if I switch devices?",
    a: "Yes. Everything is stored in the cloud. Your FSRS state, phase, fingerprint, streak, and answer history sync across all devices.",
  },
  {
    q: "Is there a free tier?",
    a: "We don't offer a perma-free plan. We offer a 7-day free trial of the full product (every feature unlocked) with the card on file. If you cancel before day 8 you pay $0. We made this trade because it cuts the no-real-intent signups that were dominating the free tier and lets us put our infra and support behind people who actually want to pass.",
  },
];

export default async function LandingPage() {
  const testimonials = await getTestimonials();

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#0f1117]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold gradient-text">Maestring</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn-primary text-sm px-4 py-2 rounded-lg"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-sm text-indigo-400 mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-slow" />
          AWS SAA-C03 · 9-Phase Coach · FSRS-4.5
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
          Know exactly when
          <br />
          <span className="gradient-text">you&rsquo;re ready to pass</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Maestring orchestrates your prep through a <strong className="text-white">9-phase cognitive engine</strong> — calibrating
          your memory, then sequencing exposure, retrieval, interleaving, drills and transfer at the right moment.
          A live <strong className="text-white">Readiness Score 0-100</strong> tells you when you&rsquo;re actually ready.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="btn-primary px-8 py-4 text-lg rounded-xl font-semibold">
            Start free trial →
          </Link>
          <Link href="#how-it-works" className="btn-outline px-8 py-4 text-lg rounded-xl font-semibold">
            See how it works
          </Link>
        </div>
        <p className="text-zinc-500 text-sm mt-6">7-day free trial · Card on file · Cancel any time before day 8 for $0</p>
      </section>

      {/* Product screenshot — swap src when /public/readiness-demo.gif (or .png) is ready.
          Falls back to a styled placeholder card so the landing never ships broken. */}
      <section className="max-w-5xl mx-auto px-6 -mt-8 mb-16">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-500/10 to-transparent p-2 shadow-2xl shadow-indigo-500/10">
          <div className="aspect-[16/9] w-full rounded-xl bg-zinc-900/80 overflow-hidden flex items-center justify-center">
            {/* Replace this block with <Image src="/readiness-demo.gif" ... /> once asset exists. */}
            <div className="text-center px-6">
              <div className="inline-block text-7xl font-black gradient-text mb-3">72</div>
              <div className="text-sm uppercase tracking-widest text-zinc-400 mb-1">Readiness Score</div>
              <div className="text-xs text-zinc-500 mb-1">Phase: Interleaving · 18 / 30 attempts · 67% accuracy</div>
              <div className="text-xs text-zinc-500">Weakest domain: Secure (30% exam weight) · 12 concepts at risk</div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> 24 mastered
                <span className="ml-2 h-2 w-2 rounded-full bg-blue-500" /> 31 proficient
                <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" /> 42 familiar
                <span className="ml-2 h-2 w-2 rounded-full bg-rose-500" /> 18 learning
                <span className="ml-2 h-2 w-2 rounded-full bg-zinc-600" /> 27 not seen
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-3">Live Readiness Score — updated after every study session.</p>
      </section>

      {/* Guarantee strip */}
      <section className="border-y border-emerald-500/20 bg-emerald-500/5 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10 text-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div className="text-sm">
              <div className="font-semibold text-emerald-300">Pass-or-refund guarantee</div>
              <div className="text-zinc-400">Hit 80+ Readiness and fail? Full refund, no questions.</div>
            </div>
          </div>
          <div className="hidden md:block w-px h-10 bg-emerald-500/20" />
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div className="text-sm">
              <div className="font-semibold text-emerald-300">Live Readiness Score</div>
              <div className="text-zinc-400">Know your pass probability in real time.</div>
            </div>
          </div>
          <div className="hidden md:block w-px h-10 bg-emerald-500/20" />
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div className="text-sm">
              <div className="font-semibold text-emerald-300">9-phase orchestrator</div>
              <div className="text-zinc-400">Not a static question bank. A cognitive system.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">Everything you need to pass</h2>
        <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
          Not a question dump. An intelligent study system that adapts to you.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-base card-hover p-6">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Positioning — Skill Builder + Maestring. Three-column comparison
          (left: AWS, middle: combo, right: us). Reframes us as a complement
          rather than a competitor — neutralizes the #1 sales objection
          "but AWS already has its own resources". */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-block text-xs uppercase tracking-widest text-indigo-400 mb-3">
            Works with what you already use
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Skill Builder teaches AWS.
            <br />
            <span className="gradient-text">Maestring gets you certified.</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            AWS Skill Builder is the authoritative source for AWS content — you should use it.
            Maestring is the exam-readiness layer on top. We give you the one thing AWS
            structurally can&rsquo;t: an honest prediction of your pass probability before you spend
            $150 on the real exam.
          </p>
        </div>

        <div className="text-center text-xs text-zinc-500 mb-3">
          <span className="text-emerald-400">✓ included</span>
          <span className="mx-3">·</span>
          <span className="text-zinc-500">✕ not included</span>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="card-base p-6">
            <div className="text-sm font-semibold text-zinc-300 mb-1">AWS Skill Builder</div>
            <div className="text-xs text-zinc-500 mb-4">AWS&rsquo;s official learning platform</div>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Official AWS content &amp; hands-on labs</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Video courses by AWS instructors</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">✕</span>Static question bank (no scheduling)</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">✕</span>No readiness prediction</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">✕</span>No phase-orchestrated learning</li>
            </ul>
          </div>

          <div className="card-base p-6 border-indigo-500/30 relative">
            <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider">
              IDEAL STACK
            </div>
            <div className="text-sm font-semibold text-indigo-300 mb-1">Both, together</div>
            <div className="text-xs text-zinc-500 mb-4">
              <span className="text-zinc-400">Skill Builder $29</span>
              <span className="text-zinc-600"> + </span>
              <span className="text-zinc-400">Maestring Pro $19</span>
              <span className="text-zinc-600"> = </span>
              <span className="text-zinc-300 font-semibold">~$48/mo total</span>
            </div>
            <ul className="text-sm text-zinc-300 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Learn AWS from AWS itself</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Measure readiness with Maestring</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Practice 2,000+ exam-pattern questions</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Honest pass probability before exam day</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Pass-or-refund safety net</li>
            </ul>
          </div>

          <div className="card-base p-6">
            <div className="text-sm font-semibold text-zinc-300 mb-1">Maestring</div>
            <div className="text-xs text-zinc-500 mb-4">The readiness layer on top of any source</div>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Live Readiness Score 0–100</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>9-phase Coach (Calibration → Mastery)</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>FSRS-4.5 spaced repetition</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Cognitive fingerprint + sleep gate</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Pass-or-refund guarantee</li>
            </ul>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-8 max-w-xl mx-auto leading-relaxed">
          Different incentives, shared outcome. AWS profits when you sit the exam.
          We profit when you pass it. Use both.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-zinc-900/50 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="space-y-8">
            {[
              { step: "01", title: "Calibrate (5 min, one time)", desc: "An n-back test, a reaction-time test, and a short profile of your chronotype, sleep window, and cognitive load budget. The Coach uses this to schedule the rest." },
              { step: "02", title: "Read the syllabus passively (Ambient)", desc: "Top-12 concepts shown one at a time, no quizzing. Mere-exposure builds the scaffolding before retrieval lands." },
              { step: "03", title: "Anchoring → Retrieval → Interleaving", desc: "Open-ended generation prompts, then easy-mode quizzes for confidence, then domains intentionally mixed to deepen discrimination. FSRS schedules every concept individually." },
              { step: "04", title: "Automation drills + Transfer", desc: "8-second timed drills until recognition is automatic. Then multi-concept exam-style scenarios. Hit Mastery and the system maintains it forever." },
            ].map((step) => (
              <div key={step.step} className="flex gap-6 items-start">
                <div className="text-5xl font-black text-indigo-500/20 shrink-0 w-16">{step.step}</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-zinc-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — only rendered if we have approved real quotes.
          No fake fallback (FTC truth-in-advertising). */}
      {testimonials.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-center mb-2">From engineers who passed</h2>
          <p className="text-zinc-500 text-center mb-12 text-sm">
            Real, verified quotes. Submit yours from Settings after you clear the exam.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.slice(0, 6).map((t) => (
              <div key={t.id} className="card-base p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-zinc-300 mb-4 leading-relaxed">&ldquo;{t.content}&rdquo;</p>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-semibold text-sm">{t.display_name}</div>
                    {t.role && <div className="text-zinc-500 text-sm">{t.role}</div>}
                  </div>
                  {t.exam_passed && t.scaled_score && (
                    <div className="text-xs text-emerald-400 border border-emerald-500/30 rounded px-2 py-0.5">
                      Passed · {t.scaled_score}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="bg-zinc-900/50 py-24">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">One plan, no tricks</h2>
          <p className="text-zinc-400 text-center mb-10">
            Try everything free for 7 days. Cancel before day 8 and pay $0.
          </p>
          <div className="card-base p-8 border-indigo-500/30 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs px-3 py-1 rounded-full font-semibold">7-DAY FREE TRIAL</div>
            <div className="text-center">
              <div className="text-lg font-semibold mb-1">Maestring Pro</div>
              <div className="text-5xl font-black mb-1">$19<span className="text-lg text-zinc-400 font-normal">/mo</span></div>
              <div className="text-zinc-500 text-sm mb-6">After the 7-day trial · cancel any time</div>
            </div>
            <ul className="space-y-2.5 text-zinc-300 text-sm mb-8">
              {[
                "Full 142-concept SAA-C03 syllabus",
                "9-phase Coach (Calibration → Mastery)",
                "2,000+ pre-generated exam-pattern questions",
                "FSRS-4.5 spaced repetition",
                "Knowledge Map + flashcards",
                "65-question mock exam (full simulator)",
                "Cognitive fingerprint calibration",
                "PDF upload + RAG-powered questions from your notes",
                "Pass-or-refund guarantee",
                "Email digests + priority support",
              ].map((f) => (
                <li key={f} className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/signup?plan=pro" className="btn-primary w-full text-center py-3 rounded-lg block">
              Start 7-day free trial →
            </Link>
            <p className="text-[11px] text-zinc-500 mt-3 text-center leading-relaxed">
              Card on file required · $0 today · Reminder email 3 days before the first charge ·
              Cancel any time from Settings → Billing
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
        <div className="space-y-6">
          {FAQS.map((faq) => (
            <div key={faq.q} className="card-base p-6">
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-500/10 border-y border-indigo-500/20 py-20 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to get certified?</h2>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">Join engineers who passed AWS SAA with Maestring. Free to start, cancel any time.</p>
        <Link href="/signup" className="btn-primary px-10 py-4 text-lg rounded-xl font-semibold inline-block">
          Start your 7-day free trial →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xl font-bold gradient-text">Maestring</span>
          <div className="flex gap-8 text-sm text-zinc-500">
            <Link href="/legal/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
            <a href="mailto:hello@maestring.app" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
          <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} Maestring</p>
        </div>
      </footer>
    </div>
  );
}
