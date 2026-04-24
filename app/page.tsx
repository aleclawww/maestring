import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Maestring — Adaptive AWS Certification Prep",
  description:
    "Pass the AWS Solutions Architect Associate exam faster with AI-powered adaptive questions, spaced repetition, and real-time progress analytics.",
};

const FEATURES = [
  {
    icon: "🧠",
    title: "Adaptive Questions",
    desc: "Claude generates unique, exam-quality questions tailored to your weak areas, so you never waste time on what you already know.",
  },
  {
    icon: "🔄",
    title: "Spaced Repetition (FSRS v5)",
    desc: "The most advanced open-source algorithm schedules your reviews at the optimal moment — right before you would have forgotten.",
  },
  {
    icon: "📄",
    title: "Upload Your Own Materials",
    desc: "Drop in any AWS PDF and we extract, embed, and generate questions from your notes automatically.",
  },
  {
    icon: "📊",
    title: "Domain-Level Analytics",
    desc: "See exactly how you stack up across all four SAA-C03 domains: Resilient, Performant, Secure, and Cost-Optimized.",
  },
  {
    icon: "🎯",
    title: "65-Question Exam Simulator",
    desc: "Full-length practice exams with a timed environment, question flagging, and detailed post-exam breakdowns.",
  },
  {
    icon: "🔥",
    title: "Streak & Gamification",
    desc: "Daily streak tracking, XP, and achievement badges keep you accountable without the gimmicks.",
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
    a: "AWS Solutions Architect Associate (SAA-C03). We're adding AWS Developer Associate, SysOps, and Professional tiers based on demand.",
  },
  {
    q: "How is this different from Udemy or A Cloud Guru?",
    a: "Those platforms give you a fixed question bank. Maestring generates fresh questions adapted to your specific gaps and schedules reviews scientifically so you retain information long-term, not just for test day.",
  },
  {
    q: "Do I still need AWS Skill Builder?",
    a: "Yes — keep it. Skill Builder is the authoritative source for AWS content and official labs. Maestring is the adaptive exam-readiness layer on top: it tells you when you're actually ready to pass, something AWS can't do for you (AWS is paid when you sit the exam; we're paid when you pass it). Most of our users run both.",
  },
  {
    q: "How does Maestring compare to the official AWS practice exam?",
    a: "The official practice exam is a single 20-question set — useful once, not repeatable. Maestring gives you unlimited adaptive questions, spaced repetition, and a live Readiness Score that updates every session. Use the official practice exam as a final checkpoint; use Maestring to get there.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No lock-ins, no dark patterns. Cancel from Settings → Billing at any time and you keep access until the end of your billing period.",
  },
  {
    q: "Is my progress saved if I switch devices?",
    a: "Yes. Everything is stored in the cloud. Your FSRS state, streak, and question history sync across all devices.",
  },
  {
    q: "Do you offer a free tier?",
    a: "Yes — the free plan includes 20 AI-generated questions per day, access to the knowledge graph, and basic progress tracking. The Pro plan removes limits and adds PDF uploads, exam simulator, and advanced analytics.",
  },
];

export default async function LandingPage() {
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "";
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
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-sm text-indigo-400 mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-slow" />
          AWS SAA-C03 · AI-Powered · FSRS v5
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
          Know exactly when
          <br />
          <span className="gradient-text">you&rsquo;re ready to pass</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Maestring gives you a live <strong className="text-white">Readiness Score 0–100</strong> that predicts your AWS SAA
          outcome weeks before the exam — powered by adaptive AI questions and the FSRS-4.5 memory model.
          Stop guessing. Start measuring.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="btn-primary px-8 py-4 text-lg rounded-xl font-semibold">
            Start for free →
          </Link>
          <Link href="#how-it-works" className="btn-outline px-8 py-4 text-lg rounded-xl font-semibold">
            See how it works
          </Link>
        </div>
        <p className="text-zinc-500 text-sm mt-6">No credit card required · Free tier forever</p>
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
              <div className="text-xs text-zinc-500">Pass probability 68% · Weakest: Networking · 12 concepts at risk</div>
              <div className="mt-6 flex justify-center gap-1">
                <div className="h-2 w-8 rounded bg-rose-500/60"></div>
                <div className="h-2 w-8 rounded bg-amber-500/60"></div>
                <div className="h-2 w-8 rounded bg-emerald-500"></div>
                <div className="h-2 w-8 rounded bg-emerald-500"></div>
                <div className="h-2 w-8 rounded bg-zinc-700"></div>
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
              <div className="font-semibold text-emerald-300">FSRS-4.5 + Claude</div>
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

      {/* Positioning — Skill Builder + Maestring. Neutralizes the #1 objection
          ("but AWS has its own resources") by reframing us as a complement,
          not a competitor. SEO-friendly and moves us up the funnel. */}
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
            Maestring is the adaptive exam-readiness layer on top. We give you the one thing AWS
            structurally can&rsquo;t: an honest prediction of your pass probability before you spend
            $150 on the real exam.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="card-base p-6">
            <div className="text-sm font-semibold text-zinc-300 mb-3">AWS Skill Builder</div>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Official content & labs</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Video courses by AWS instructors</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">—</span>Static question bank</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">—</span>No readiness prediction</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">—</span>No adaptive difficulty</li>
            </ul>
          </div>

          <div className="card-base p-6 border-indigo-500/30 relative">
            <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider">
              IDEAL STACK
            </div>
            <div className="text-sm font-semibold text-indigo-300 mb-3">Both, together</div>
            <ul className="text-sm text-zinc-300 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Learn AWS from AWS</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Measure readiness with Maestring</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Fresh adaptive questions forever</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Pass on the first attempt</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>~€48/mo combined</li>
            </ul>
          </div>

          <div className="card-base p-6">
            <div className="text-sm font-semibold text-zinc-300 mb-3">Maestring</div>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Live Readiness Score 0–100</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>FSRS-4.5 spaced repetition</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Unlimited adaptive AI questions</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Productive-error elaboration</li>
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
              { step: "01", title: "Sign up and set your exam date", desc: "Tell us when you want to take the exam and we build a personalized study plan." },
              { step: "02", title: "Study with adaptive AI questions", desc: "Each session generates fresh questions targeting your weak domains. Answer, learn, and get detailed explanations." },
              { step: "03", title: "FSRS schedules your reviews", desc: "The algorithm tracks your memory for each concept and reminds you at the optimal moment before you forget." },
              { step: "04", title: "Track your readiness score", desc: "Watch your domain scores climb toward exam-ready. Take a full 65-question simulator when you feel confident." },
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
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
          <p className="text-zinc-400 text-center mb-12">No tricks. Cancel any time.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-base p-8">
              <div className="text-lg font-semibold mb-1">Free</div>
              <div className="text-4xl font-black mb-6">$0<span className="text-lg text-zinc-400 font-normal">/mo</span></div>
              <ul className="space-y-3 text-zinc-400 text-sm mb-8">
                {["20 AI questions/day", "Knowledge graph access", "Basic progress tracking", "5-question exam preview"].map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-emerald-400">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/signup" className="btn-outline w-full text-center py-3 rounded-lg block">
                Get started
              </Link>
            </div>
            <div className="card-base p-8 border-indigo-500/30 relative">
              <div className="absolute -top-3 right-6 bg-indigo-500 text-white text-xs px-3 py-1 rounded-full font-semibold">MOST POPULAR</div>
              <div className="text-lg font-semibold mb-1">Pro</div>
              <div className="text-4xl font-black mb-6">$19<span className="text-lg text-zinc-400 font-normal">/mo</span></div>
              <ul className="space-y-3 text-zinc-400 text-sm mb-8">
                {["Unlimited AI questions", "PDF upload & processing", "Full exam simulator", "Advanced domain analytics", "Streak email reminders", "Priority support"].map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-emerald-400">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/signup?plan=pro" className="btn-primary w-full text-center py-3 rounded-lg block">
                Start 7-day free trial
              </Link>
            </div>
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
          Start studying for free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xl font-bold gradient-text">Maestring</span>
          <div className="flex gap-8 text-sm text-zinc-500">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
            <a href="mailto:hello@maestring.app" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
          <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} Maestring</p>
        </div>
      </footer>
    </div>
  );
}
