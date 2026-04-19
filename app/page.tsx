import Link from "next/link";
import type { Metadata } from "next";

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

const TESTIMONIALS = [
  {
    name: "Sofia M.",
    role: "Cloud Engineer",
    text: "I failed my first SAA attempt using Udemy alone. With Maestring's adaptive engine I passed on my second try in 6 weeks.",
    stars: 5,
  },
  {
    name: "Raj P.",
    role: "DevOps Lead",
    text: "The spaced repetition is a game changer. I went from 60% to 85% on practice exams in 3 weeks.",
    stars: 5,
  },
  {
    name: "Alex K.",
    role: "Backend Engineer",
    text: "I uploaded the AWS Well-Architected whitepaper and it generated 200 fresh questions overnight. Incredible.",
    stars: 5,
  },
];

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

export default function LandingPage() {
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "";

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
          Pass AWS SAA
          <br />
          <span className="gradient-text">the smart way</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Adaptive AI questions + spaced repetition = faster certification at a fraction of the time.
          Study less. Retain more. Pass sooner.
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

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">From engineers who passed</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card-base p-6">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-zinc-300 mb-4 leading-relaxed">"{t.text}"</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-zinc-500 text-sm">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

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
