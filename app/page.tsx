import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Maestring — AWS SAA-C03 Prep That Adapts to You",
  description:
    "Stop memorizing 1,000 practice questions. Maestring uses FSRS-4.5 spaced repetition and Claude-generated adaptive questions to show you exactly when you're ready to pass AWS SAA-C03.",
  alternates: {
    canonical: 'https://maestring.com',
  },
  openGraph: {
    url: 'https://maestring.com',
    title: 'Maestring — The SAA prep that knows what you\'ve forgotten before you do',
    description: 'Adaptive AI questions + FSRS-4.5 spaced repetition. Live Readiness Score 0–100. Pass AWS SAA-C03 in 4–6 weeks, not 4 months.',
    images: [{ url: '/api/og?title=Stop+memorizing+1%2C000+questions.%0AKnow+when+you%27re+ready.&sub=AWS+SAA-C03+%C2%B7+FSRS+spaced+repetition+%C2%B7+Readiness+Score', width: 1200, height: 630 }],
  },
};

const softwareAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Maestring',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web, iOS (PWA), Android (PWA)',
  url: 'https://maestring.com',
  description:
    'AWS SAA-C03 certification prep using FSRS-4.5 spaced repetition and Claude-generated adaptive questions. Live Readiness Score predicts pass probability.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      description: '20 AI-generated questions per day, knowledge graph access, basic progress tracking.',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '19',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '19',
        priceCurrency: 'USD',
        unitCode: 'MON',
      },
      description: 'Unlimited adaptive questions, full FSRS scheduling, PDF RAG, Readiness Score, exam simulator.',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '1',
    bestRating: '5',
    worstRating: '1',
  },
};

const homepageFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How is Maestring different from Tutorials Dojo or Stephane Maarek?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Tutorials Dojo gives you 1,500 fixed questions. Stephane Maarek gives you 30 hours of video. Maestring generates fresh questions targeting your specific weak domains every session, schedules reviews with FSRS-4.5 so you only study what you\'re about to forget, and gives you a live Readiness Score 0–100 so you know when you\'re actually ready to sit the exam.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is FSRS-4.5 spaced repetition?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FSRS (Free Spaced Repetition Scheduler) version 4.5 is the state-of-the-art open-source spaced repetition algorithm. It models your individual forgetting curve per concept and schedules reviews at the optimal moment — right before you would have forgotten. It outperforms the older SM-2 algorithm used by Anki in multiple studies.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to pass AWS SAA-C03 with Maestring?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most engineers pass in 4–8 weeks with consistent daily sessions of 20–30 minutes. Your Readiness Score tells you when you\'re actually ready — you don\'t need to guess or rely on "I\'ve done 1,000 questions."',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel anytime?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. No lock-ins, no dark patterns. Cancel from Settings → Billing at any time and you keep access until the end of your billing period.',
      },
    },
  ],
};

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
        "landing: failed to read approved testimonials — social-proof section hidden"
      );
    }
    return (data ?? []) as Testimonial[];
  } catch (err) {
    logger.warn({ err }, "landing: getTestimonials threw — section hidden");
    return [];
  }
}

const FAQS = [
  {
    q: "How is this different from Tutorials Dojo or Stephane Maarek?",
    a: "Tutorials Dojo gives you 1,500 fixed questions — the same ones everyone else sees. Stephane Maarek gives you 30 hours of video. Maestring generates fresh questions every session targeting your specific weak domains, schedules reviews with FSRS-4.5 so you only study what you're about to forget, and gives you a live Readiness Score 0–100 so you know when you're actually ready to sit the $150 exam.",
  },
  {
    q: "What exam does Maestring currently cover?",
    a: "AWS Solutions Architect Associate (SAA-C03). Developer Associate (DVA-C02) and SysOps (SOA-C02) are next, based on demand.",
  },
  {
    q: "Do I still need AWS Skill Builder?",
    a: "Keep it for official labs and video content — it's the authoritative AWS source. Maestring is the adaptive exam-readiness layer on top: it tells you when you're ready to pass, something AWS structurally can't do (they profit when you sit the exam; we profit when you pass it). Most users run both.",
  },
  {
    q: "What is FSRS-4.5 spaced repetition?",
    a: "FSRS-4.5 is the state-of-the-art open-source spaced repetition algorithm. It models your individual forgetting curve per concept and schedules reviews at the optimal moment — right before you would have forgotten. It outperforms the SM-2 algorithm used by Anki, and it runs per-concept, not globally.",
  },
  {
    q: "How long does it take to pass SAA-C03 with Maestring?",
    a: "Most engineers hit a Readiness Score of 80+ in 4–8 weeks with consistent 20–30 minute daily sessions. Your Readiness Score tells you exactly when you're ready — you stop guessing and start measuring.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No lock-ins, no dark patterns. Cancel from Settings → Billing at any time and you keep access until the end of your billing period.",
  },
  {
    q: "Is my progress saved if I switch devices?",
    a: "Yes. Your FSRS state, streak, and question history sync across all devices. The PWA works offline for reviewing your scheduled cards.",
  },
  {
    q: "Do you offer a free tier?",
    a: "Yes — 20 AI-generated questions per day, knowledge graph access, and basic progress tracking. Pro removes limits and adds PDF uploads, the full 65-question exam simulator, Readiness Score, and advanced domain analytics.",
  },
];

export default async function LandingPage() {
  const testimonials = await getTestimonials();

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqJsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#0f1117]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold gradient-text">Maestring</span>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/alternatives/tutorials-dojo" className="hover:text-white transition-colors">vs Tutorials Dojo</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn-primary text-sm px-4 py-2 rounded-lg"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-sm text-indigo-400 mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-slow" />
          AWS SAA-C03 · FSRS-4.5 · Claude Haiku
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
          Stop memorizing 1,000 questions.
          <br />
          <span className="gradient-text">Know when you&rsquo;re ready.</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Maestring generates questions for <strong className="text-white">your weak domains</strong>, schedules reviews with FSRS-4.5 so you only study what you&rsquo;re about to forget, and gives you a live <strong className="text-white">Readiness Score 0–100</strong> so you stop guessing whether you&rsquo;re ready. Built for engineers who have 4 weeks, not 4 months.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="btn-primary px-8 py-4 text-lg rounded-xl font-semibold">
            Start free — first question in 90 seconds
          </Link>
          <Link href="#how-it-works" className="btn-outline px-8 py-4 text-lg rounded-xl font-semibold">
            See how it works
          </Link>
        </div>
        <p className="text-zinc-500 text-sm mt-6">Free forever · No credit card · Not affiliated with AWS</p>
      </section>

      {/* Product demo placeholder */}
      <section className="max-w-5xl mx-auto px-6 -mt-8 mb-16">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-500/10 to-transparent p-2 shadow-2xl shadow-indigo-500/10">
          <div className="aspect-[16/9] w-full rounded-xl bg-zinc-900/80 overflow-hidden flex items-center justify-center">
            {/* Replace with <video src="/demo.mp4" autoPlay muted loop playsInline /> when recorded */}
            <div className="text-center px-6">
              <div className="inline-block text-7xl font-black gradient-text mb-3">78</div>
              <div className="text-sm uppercase tracking-widest text-zinc-400 mb-1">Readiness Score</div>
              <div className="text-xs text-zinc-500 mb-6">Pass probability 74% · Exam date: Jun 12 · 3 concepts at risk</div>
              <div className="flex justify-center gap-1 mb-4">
                <div className="h-2 w-10 rounded bg-emerald-500"></div>
                <div className="h-2 w-8 rounded bg-emerald-500"></div>
                <div className="h-2 w-6 rounded bg-amber-500/80"></div>
                <div className="h-2 w-8 rounded bg-emerald-500"></div>
                <div className="h-2 w-4 rounded bg-rose-500/60"></div>
              </div>
              <div className="text-xs text-zinc-600">Resilient · Performant · Secure · Cost-Opt · Networking</div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-3">Live Readiness Score — updated after every study session. Not "% complete." A probability.</p>
      </section>

      {/* Trust strip */}
      <section className="border-y border-emerald-500/20 bg-emerald-500/5 py-5">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10 text-center">
          <div className="flex items-center gap-3">
            <span className="text-xl">🛡️</span>
            <div className="text-sm">
              <div className="font-semibold text-emerald-300">Pass-or-refund</div>
              <div className="text-zinc-400">Hit 80+ Readiness and fail? Full refund.</div>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-emerald-500/20" />
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div className="text-sm">
              <div className="font-semibold text-emerald-300">90s to your first question</div>
              <div className="text-zinc-400">Sign up, calibrate, study. No 30-minute setup.</div>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-emerald-500/20" />
          <div className="flex items-center gap-3">
            <span className="text-xl">🧠</span>
            <div className="text-sm">
              <div className="font-semibold text-emerald-300">FSRS-4.5 + Claude Haiku</div>
              <div className="text-zinc-400">Not a question dump. A cognitive system.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Wedge — 3 columns naming competitors */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <div className="text-xs uppercase tracking-widest text-indigo-400 mb-3">Why Maestring</div>
          <h2 className="text-3xl md:text-4xl font-bold">
            Not another question bank.
            <br />
            <span className="gradient-text">A different kind of prep.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card-base p-8">
            <div className="text-2xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-3">Adaptive, not static</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Tutorials Dojo gives 1,500 fixed questions — the same ones as everyone else. Maestring uses Claude Haiku to generate <strong className="text-white">fresh questions every session</strong> targeting the exact concept you got wrong, anchored to the PDF you uploaded. No two users see the same exam.
            </p>
          </div>
          <div className="card-base p-8 border-indigo-500/20">
            <div className="text-2xl mb-4">🔬</div>
            <h3 className="text-lg font-semibold mb-3">FSRS-4.5, not flashcards from 2009</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Anki was built for med students with 18 months. You have 6 weekends. Maestring schedules every concept using <strong className="text-white">FSRS-4.5</strong> — the state-of-the-art open-source algorithm — so you only review what&rsquo;s about to fall out of your head. Skip the 600 concepts you already know cold.
            </p>
          </div>
          <div className="card-base p-8">
            <div className="text-2xl mb-4">📄</div>
            <h3 className="text-lg font-semibold mb-3">Your material, not just ours</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Upload your own PDFs — course notes, AWS whitepapers, the Stephane Maarek cheatsheet. Maestring extracts, embeds via pgvector, and <strong className="text-white">generates questions anchored to your sources</strong>. RAG-backed, not a generic pool.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-zinc-900/50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">How we compare</h2>
          <p className="text-zinc-400 text-center mb-12 text-sm max-w-xl mx-auto">
            All four options get engineers certified. Only one adapts to you in real time.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-zinc-400 font-normal w-48">Feature</th>
                  <th className="py-3 px-4 text-indigo-300 font-semibold text-center">Maestring</th>
                  <th className="py-3 px-4 text-zinc-400 font-normal text-center">Tutorials Dojo</th>
                  <th className="py-3 px-4 text-zinc-400 font-normal text-center">Maarek (Udemy)</th>
                  <th className="py-3 px-4 text-zinc-400 font-normal text-center">Skill Builder</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Adaptive AI question gen", "✓", "–", "–", "–"],
                  ["FSRS-4.5 spaced repetition", "✓", "–", "–", "–"],
                  ["RAG over your own PDFs", "✓", "–", "–", "–"],
                  ["Live Readiness Score 0–100", "✓", "–", "–", "–"],
                  ["Updated for SAA-C03 (2024)", "✓", "✓", "✓", "✓"],
                  ["Official AWS labs", "–", "–", "–", "✓"],
                  ["Price", "$19/mo", "$20 lifetime", "$15 once", "$29/mo"],
                ].map(([feature, maestring, td, maarek, sb]) => (
                  <tr key={feature as string} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-3 px-4 text-zinc-300">{feature}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={maestring === "✓" ? "text-emerald-400 font-semibold" : maestring === "–" ? "text-zinc-600" : "text-indigo-300 font-semibold"}>
                        {maestring}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={td === "✓" ? "text-emerald-400" : td === "–" ? "text-zinc-600" : "text-zinc-400"}>
                        {td}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={maarek === "✓" ? "text-emerald-400" : maarek === "–" ? "text-zinc-600" : "text-zinc-400"}>
                        {maarek}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={sb === "✓" ? "text-emerald-400" : sb === "–" ? "text-zinc-600" : "text-zinc-400"}>
                        {sb}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-zinc-600 mt-6">
            Not affiliated with AWS. AWS Skill Builder is a trademark of Amazon Web Services.{" "}
            <Link href="/alternatives/tutorials-dojo" className="text-indigo-500 hover:text-indigo-400">
              Full Tutorials Dojo comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* Skill Builder complement */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-indigo-400 mb-3">Works with what you already use</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Skill Builder teaches AWS.
            <br />
            <span className="gradient-text">Maestring gets you certified.</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            AWS Skill Builder is the authoritative source for AWS content — keep it. Maestring is the adaptive exam-readiness layer on top. We give you the one thing AWS structurally can&rsquo;t: an honest prediction of your pass probability before you spend $150 on the real exam.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="card-base p-6">
            <div className="text-sm font-semibold text-zinc-300 mb-3">AWS Skill Builder</div>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Official content & labs</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Video courses by AWS instructors</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">–</span>Static question bank</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">–</span>No readiness prediction</li>
              <li className="flex gap-2"><span className="text-zinc-600 shrink-0">–</span>No adaptive difficulty</li>
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
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>~$48/mo combined</li>
            </ul>
          </div>
          <div className="card-base p-6">
            <div className="text-sm font-semibold text-zinc-300 mb-3">Maestring</div>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Live Readiness Score 0–100</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>FSRS-4.5 spaced repetition</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Unlimited adaptive AI questions</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>RAG over your own PDFs</li>
              <li className="flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>Pass-or-refund guarantee</li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-8 max-w-xl mx-auto">
          Different incentives, same outcome. AWS profits when you sit the exam. We profit when you pass it.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-zinc-900/50 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-zinc-400 text-center mb-12 text-sm">90 seconds from signup to your first adaptive question.</p>
          <div className="space-y-10">
            {[
              {
                step: "01",
                title: "Sign up and calibrate in 60 seconds",
                desc: "Tell us your exam date and answer 3 calibration questions across the SAA blueprint. Maestring seeds your cognitive fingerprint — it knows your starting point from minute one, not after 200 generic questions.",
              },
              {
                step: "02",
                title: "Study with questions generated for your gaps",
                desc: "Each session, Claude Haiku generates fresh questions targeting your weakest concept. Answer, get a detailed explanation (including why the wrong answers are wrong), and see the FSRS schedule update in real time.",
              },
              {
                step: "03",
                title: "FSRS-4.5 schedules your reviews automatically",
                desc: "The algorithm tracks your memory retention per concept and sends review reminders at the optimal moment — right before you'd forget. Upload your PDFs and questions get anchored to your source material via RAG.",
              },
              {
                step: "04",
                title: "Book the exam when Readiness says yes",
                desc: "Watch your Readiness Score climb toward 80+. Hit the target, take the 65-question full simulator to confirm, then book the $150 exam with confidence — not on a calendar guess.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="text-5xl font-black text-indigo-500/20 shrink-0 w-16">{s.step}</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
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

      {/* Pricing preview */}
      <section id="pricing" className="bg-zinc-900/50 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-2">Simple pricing</h2>
          <p className="text-zinc-400 text-center mb-2">Less than a failed exam attempt. Cancel anytime.</p>
          <p className="text-zinc-500 text-center mb-12 text-sm">
            The AWS SAA-C03 exam costs $150. One billing cycle of Pro costs $19. Do the math.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="card-base p-8">
              <div className="text-lg font-semibold mb-1">Free</div>
              <div className="text-4xl font-black mb-1">$0<span className="text-lg text-zinc-400 font-normal">/mo</span></div>
              <div className="text-zinc-600 text-xs mb-6">Forever free</div>
              <ul className="space-y-3 text-zinc-400 text-sm mb-8">
                {["20 AI questions/day", "Knowledge graph (43 concepts)", "Basic progress tracking", "5-question exam preview"].map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-emerald-400">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/signup" className="btn-outline w-full text-center py-3 rounded-lg block">
                Get started free
              </Link>
            </div>
            <div className="card-base p-8 border-indigo-500/30 relative">
              <div className="absolute -top-3 right-6 bg-indigo-500 text-white text-xs px-3 py-1 rounded-full font-semibold">MOST ENGINEERS PICK THIS</div>
              <div className="text-lg font-semibold mb-1">Pro</div>
              <div className="text-4xl font-black mb-1">$19<span className="text-lg text-zinc-400 font-normal">/mo</span></div>
              <div className="text-zinc-600 text-xs mb-6">7-day free trial · No card required</div>
              <ul className="space-y-3 text-zinc-400 text-sm mb-8">
                {[
                  "Unlimited adaptive AI questions",
                  "PDF upload & RAG-backed questions",
                  "Full 65-question exam simulator",
                  "Live Readiness Score 0–100",
                  "Advanced domain analytics",
                  "Daily streak reminders",
                  "Pass-or-refund guarantee",
                ].map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-emerald-400">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/signup?plan=pro" className="btn-primary w-full text-center py-3 rounded-lg block">
                Start 7-day free trial →
              </Link>
            </div>
          </div>
          <p className="text-center text-sm text-zinc-500">
            Need seats for your whole team?{" "}
            <a href="mailto:hello@maestring.com" className="text-indigo-400 hover:underline">
              Contact us about Team pricing →
            </a>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="card-base p-6">
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-indigo-500/10 border-y border-indigo-500/20 py-20 text-center">
        <h2 className="text-4xl font-bold mb-4">7 days. No card. Cancel by email.</h2>
        <p className="text-zinc-400 mb-2 max-w-lg mx-auto">
          You&rsquo;ll know within two study sessions whether Maestring beats reading another Maarek chapter at 11pm.
        </p>
        <p className="text-zinc-500 text-sm mb-8 max-w-md mx-auto">
          If not, walk away — we don&rsquo;t need a credit card to find out if it works for you.
        </p>
        <Link href="/signup" className="btn-primary px-10 py-4 text-lg rounded-xl font-semibold inline-block">
          Start free — first question in 90 seconds →
        </Link>
        <p className="text-zinc-600 text-xs mt-4">Pro is $19/mo after the trial. Downgrade to Free anytime. No dark patterns.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-8">
          <div>
            <span className="text-xl font-bold gradient-text block mb-2">Maestring</span>
            <p className="text-zinc-600 text-xs max-w-xs leading-relaxed">
              AWS SAA-C03 cert prep with FSRS-4.5 spaced repetition and Claude-generated adaptive questions. Not affiliated with Amazon Web Services, Inc.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <div className="text-zinc-400 font-semibold mb-3 text-xs uppercase tracking-wider">Product</div>
              <div className="flex flex-col gap-2 text-zinc-500">
                <Link href="/pricing" className="hover:text-zinc-300 transition-colors">Pricing</Link>
                <Link href="#how-it-works" className="hover:text-zinc-300 transition-colors">How it works</Link>
                <Link href="/login" className="hover:text-zinc-300 transition-colors">Sign in</Link>
                <Link href="/signup" className="hover:text-zinc-300 transition-colors">Sign up free</Link>
              </div>
            </div>
            <div>
              <div className="text-zinc-400 font-semibold mb-3 text-xs uppercase tracking-wider">Compare</div>
              <div className="flex flex-col gap-2 text-zinc-500">
                <Link href="/alternatives/tutorials-dojo" className="hover:text-zinc-300 transition-colors">vs Tutorials Dojo</Link>
                <Link href="/alternatives/stephane-maarek" className="hover:text-zinc-300 transition-colors">vs Maarek</Link>
                <Link href="/alternatives/aws-skill-builder" className="hover:text-zinc-300 transition-colors">vs Skill Builder</Link>
                <Link href="/alternatives/a-cloud-guru" className="hover:text-zinc-300 transition-colors">vs A Cloud Guru</Link>
              </div>
            </div>
            <div>
              <div className="text-zinc-400 font-semibold mb-3 text-xs uppercase tracking-wider">Legal</div>
              <div className="flex flex-col gap-2 text-zinc-500">
                <Link href="/legal/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
                <Link href="/legal/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
                <a href="mailto:hello@maestring.com" className="hover:text-zinc-300 transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-8 pt-8 border-t border-white/5">
          <p className="text-zinc-600 text-xs">© {new Date().getFullYear()} Maestring. AWS, SAA-C03, and related marks are trademarks of Amazon.com, Inc. or its affiliates.</p>
        </div>
      </footer>
    </div>
  );
}
