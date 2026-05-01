import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Tutorials Dojo Alternatives for AWS SAA-C03 (2024)",
  description:
    "Tutorials Dojo is the most popular SAA-C03 practice exam — but it's static and won't tell you when you're ready. See the best alternatives including Maestring's adaptive AI prep.",
  alternates: { canonical: 'https://maestring.com/alternatives/tutorials-dojo' },
  openGraph: {
    title: "Best Tutorials Dojo Alternatives for AWS SAA-C03",
    description: "Tutorials Dojo gives you 1,500 fixed questions. If you want adaptive prep that tells you your pass probability, here are your options.",
    url: 'https://maestring.com/alternatives/tutorials-dojo',
    images: [{
      url: 'https://maestring.com/api/og?title=Best+Tutorials+Dojo+Alternatives&sub=AWS+SAA-C03+%C2%B7+Adaptive+vs+Static+Practice+Exams&badge=vs+Tutorials+Dojo',
      width: 1200,
      height: 630,
    }],
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Tutorials Dojo worth it for AWS SAA-C03?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Tutorials Dojo (Jon Bonso) is one of the best static practice exam sets for SAA-C03. The questions are high quality and well-explained. Its main limitation is that it\'s a fixed bank — you see the same 1,500 questions as everyone else, there\'s no spaced repetition scheduling, and it can\'t tell you your pass probability. It\'s excellent as a baseline and a final checkpoint, but it shouldn\'t be your only prep tool.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best alternative to Tutorials Dojo for SAA-C03?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The best alternative depends on what\'s missing for you. If you want adaptive questions that target your weak areas and a readiness score: Maestring. If you want video courses: Stephane Maarek on Udemy. If you want official AWS content: AWS Skill Builder. Most engineers who pass on the first attempt use Tutorials Dojo + one adaptive tool.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use Maestring with Tutorials Dojo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — and we recommend it. Upload your Tutorials Dojo cheatsheet PDF to Maestring. We\'ll generate adaptive questions anchored to the exact TD sections you keep missing. TD becomes your reference; Maestring tells you what to re-read and schedules your reviews with FSRS-4.5.',
      },
    },
  ],
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://maestring.com' },
    { '@type': 'ListItem', position: 2, name: 'Alternatives', item: 'https://maestring.com/alternatives' },
    { '@type': 'ListItem', position: 3, name: 'Tutorials Dojo', item: 'https://maestring.com/alternatives/tutorials-dojo' },
  ],
};

const ALTERNATIVES = [
  {
    rank: 1,
    name: "Maestring",
    tagline: "Adaptive AI + FSRS — the readiness-first prep",
    price: "Free / $19/mo",
    best_for: "Engineers who want to know exactly when they're ready and not waste time on concepts they already know",
    pros: [
      "Generates fresh adaptive questions every session (never repeats)",
      "FSRS-4.5 spaced repetition — only reviews what you're about to forget",
      "Live Readiness Score 0–100 predicts your pass probability",
      "RAG over your own PDFs (upload TD cheatsheets, AWS whitepapers)",
      "7-day free trial, no card",
    ],
    cons: [
      "No video content (pairs well with Maarek for theory)",
      "Only SAA-C03 today (more certs coming)",
    ],
    verdict: "Best pick if you want adaptive prep that tells you when to book the exam.",
    cta_href: "/signup?ref=tutorials-dojo-alt",
    cta_text: "Try Maestring free →",
    highlight: true,
  },
  {
    rank: 2,
    name: "Tutorials Dojo (Jon Bonso)",
    tagline: "The gold standard static practice exam",
    price: "$20 lifetime",
    best_for: "A reliable, high-quality fixed question bank for final-week practice",
    pros: [
      "1,500+ high-quality, exam-realistic questions",
      "Excellent explanations with AWS docs references",
      "Affordable one-time price",
      "Covers all 4 SAA-C03 domains thoroughly",
      "Timed and review mode available",
    ],
    cons: [
      "Static — same questions as every other user",
      "No spaced repetition or adaptive scheduling",
      "Can't tell you your pass probability",
      "Questions get memorized after 2–3 passes",
      "No personalization by weak domain",
    ],
    verdict: "Strong as a baseline and final checkpoint. Weak as your only prep tool.",
    cta_href: null,
    cta_text: null,
    highlight: false,
  },
  {
    rank: 3,
    name: "Stephane Maarek (Udemy)",
    tagline: "The best video course for SAA-C03 theory",
    price: "$15 (Udemy sale)",
    best_for: "Learning AWS concepts from scratch with video explanations",
    pros: [
      "Comprehensive video coverage of all SAA domains",
      "Paired practice tests (separate purchase)",
      "Excellent for absolute beginners",
      "Frequently updated",
    ],
    cons: [
      "Passive learning — low retention without active testing",
      "No spaced repetition",
      "30+ hours of video is a significant time investment",
      "Practice tests are static (same issue as TD)",
    ],
    verdict: "Best for theory foundation. Not a replacement for active practice.",
    cta_href: null,
    cta_text: null,
    highlight: false,
  },
  {
    rank: 4,
    name: "AWS Skill Builder",
    tagline: "Official AWS content and labs",
    price: "$29/mo",
    best_for: "Official labs, hands-on scenarios, and AWS-curated video content",
    pros: [
      "Authoritative AWS source material",
      "Hands-on labs in real AWS environments",
      "Frequently updated to match current services",
      "Official practice questions (20-question set)",
    ],
    cons: [
      "Corporate UX, low engagement",
      "Static question bank, no SR",
      "Official practice exam is one-time-use",
      "Expensive if you only need practice questions",
    ],
    verdict: "Essential for labs and official content. Use alongside an adaptive tool for exam readiness.",
    cta_href: null,
    cta_text: null,
    highlight: false,
  },
  {
    rank: 5,
    name: "A Cloud Guru / Pluralsight",
    tagline: "Broad multi-cloud learning platform",
    price: "$39–49/mo",
    best_for: "Teams that need multi-cloud coverage across AWS, Azure, and GCP",
    pros: [
      "Wide catalog across cloud providers",
      "Labs included",
      "Good for breadth across certifications",
    ],
    cons: [
      "Generic, not SAA-C03 specific",
      "Most expensive option",
      "No adaptive prep or spaced repetition",
      "Quality inconsistent across courses",
    ],
    verdict: "Overkill if you just need SAA-C03. Better for teams with multi-cert roadmaps.",
    cta_href: null,
    cta_text: null,
    highlight: false,
  },
];

const COMPARISON_ROWS = [
  ["Adaptive question generation", "✓", "–", "–", "–", "–"],
  ["FSRS spaced repetition", "✓", "–", "–", "–", "–"],
  ["Live Readiness Score", "✓", "–", "–", "–", "–"],
  ["RAG over your PDFs", "✓", "–", "–", "–", "–"],
  ["Video content", "–", "–", "✓", "✓", "✓"],
  ["Hands-on labs", "–", "–", "–", "✓", "✓"],
  ["Static practice exams", "–", "✓", "✓", "✓", "✓"],
  ["Price", "$0–$19/mo", "$20 once", "$15 once", "$29/mo", "$39–49/mo"],
  ["Free trial", "✓ 7 days", "–", "–", "✓", "✓"],
];

export default function TutorialsDojoAlternativesPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#0f1117]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">Maestring</Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-zinc-400 hover:text-white text-sm transition-colors">Pricing</Link>
            <Link href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">Sign in</Link>
            <Link href="/signup" className="btn-primary text-sm px-4 py-2 rounded-lg">Start free</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-600 mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-400">Home</Link>
          <span className="mx-2">›</span>
          <span>Alternatives to Tutorials Dojo</span>
        </nav>

        {/* Hero */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Best Tutorials Dojo Alternatives
          <br />
          <span className="gradient-text">for AWS SAA-C03 (2024)</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-4 leading-relaxed">
          Tutorials Dojo (Jon Bonso) is the most trusted static practice exam for SAA-C03. But &ldquo;static&rdquo; is its core limitation — 1,500 fixed questions that can&rsquo;t tell you whether you&rsquo;re ready to sit the $150 exam.
        </p>
        <p className="text-zinc-500 mb-12 leading-relaxed">
          This guide ranks the best alternatives by what most engineers actually need: <strong className="text-zinc-300">efficient retention, not raw question count</strong>. We cover Maestring, Tutorials Dojo itself (so you know what you&rsquo;re comparing against), Stephane Maarek, AWS Skill Builder, and A Cloud Guru.
        </p>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 mb-14 text-sm">
          <strong className="text-indigo-300">TL;DR:</strong>{" "}
          <span className="text-zinc-300">
            Use Tutorials Dojo for a final-week checkpoint. Use Maestring for day-to-day adaptive prep and to know exactly when you&rsquo;re ready. Use Maarek if you need theory from scratch. All three together for &lt;$40 total beats a $150 failed exam attempt.
          </span>
        </div>

        {/* Comparison table */}
        <h2 className="text-2xl font-bold mb-6">Quick comparison</h2>
        <div className="overflow-x-auto mb-16">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-3 text-zinc-400 font-normal">Feature</th>
                <th className="py-3 px-3 text-indigo-300 font-semibold text-center">Maestring</th>
                <th className="py-3 px-3 text-zinc-400 font-normal text-center">Tutorials Dojo</th>
                <th className="py-3 px-3 text-zinc-400 font-normal text-center">Maarek</th>
                <th className="py-3 px-3 text-zinc-400 font-normal text-center">Skill Builder</th>
                <th className="py-3 px-3 text-zinc-400 font-normal text-center">ACG</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map(([feature, maestring, td, maarek, sb, acg]) => (
                <tr key={feature as string} className="border-b border-white/5">
                  <td className="py-3 px-3 text-zinc-300">{feature}</td>
                  {[maestring, td, maarek, sb, acg].map((v, i) => (
                    <td key={i} className="py-3 px-3 text-center">
                      <span className={
                        v === "✓" ? (i === 0 ? "text-emerald-400 font-semibold" : "text-emerald-400") :
                        v === "–" ? "text-zinc-600" :
                        i === 0 ? "text-indigo-300 font-semibold" : "text-zinc-400"
                      }>
                        {v}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Individual alternatives */}
        <h2 className="text-2xl font-bold mb-8">The alternatives, ranked</h2>
        <div className="space-y-8 mb-16">
          {ALTERNATIVES.map((alt) => (
            <div
              key={alt.name}
              className={`card-base p-8 ${alt.highlight ? "border-indigo-500/30" : ""}`}
            >
              <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-zinc-600 font-mono">#{alt.rank}</span>
                    <h3 className="text-xl font-bold">{alt.name}</h3>
                    {alt.highlight && (
                      <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        OUR PICK
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm">{alt.tagline}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-zinc-300">{alt.price}</div>
                  {alt.cta_href && (
                    <Link
                      href={alt.cta_href}
                      className="text-xs text-indigo-400 hover:underline mt-1 block"
                    >
                      {alt.cta_text}
                    </Link>
                  )}
                </div>
              </div>

              <div className="text-xs text-zinc-500 mb-4">
                <strong className="text-zinc-400">Best for:</strong> {alt.best_for}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-emerald-400 mb-2">Pros</div>
                  <ul className="space-y-1">
                    {alt.pros.map((p) => (
                      <li key={p} className="text-sm text-zinc-400 flex gap-2">
                        <span className="text-emerald-500 shrink-0">+</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-rose-400 mb-2">Cons</div>
                  <ul className="space-y-1">
                    {alt.cons.map((c) => (
                      <li key={c} className="text-sm text-zinc-400 flex gap-2">
                        <span className="text-rose-500 shrink-0">–</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-2">
                <p className="text-sm text-zinc-300">
                  <strong>Verdict:</strong> {alt.verdict}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
        <div className="space-y-4 mb-16">
          {[
            {
              q: "Is Tutorials Dojo worth it for AWS SAA-C03?",
              a: "Yes — as one tool in your stack. The questions are high quality and the explanations reference AWS docs. Its limitation is that it's a static bank: you see the same 1,500 questions as everyone else, there's no spaced repetition, and it can't tell you your pass probability. Use it for a final checkpoint. Use an adaptive tool like Maestring for day-to-day prep.",
            },
            {
              q: "Can I use Maestring with Tutorials Dojo?",
              a: "Recommended. Upload your Tutorials Dojo cheatsheet PDF to Maestring. We generate adaptive questions anchored to the exact TD sections you keep missing. TD becomes your reference; Maestring schedules your reviews with FSRS-4.5 so you only revisit what's about to drop.",
            },
            {
              q: "How many practice questions do I need for SAA-C03?",
              a: "Question count is a proxy metric — what matters is retention and weak-area coverage. Doing the same 1,500 questions three times is less effective than adaptive prep that surfaces your specific gaps. Most engineers who pass with Maestring do so after 300–500 adaptive questions, not 3,000 repetitions of the same pool.",
            },
            {
              q: "What's the cheapest way to pass SAA-C03?",
              a: "Free tier on Maestring + the Stephane Maarek Udemy course ($15 on sale) + the official AWS practice exam ($20). Total: ~$35. Add Tutorials Dojo ($20) if you want a second opinion. Still cheaper than a second exam attempt at $150.",
            },
          ].map((faq) => (
            <div key={faq.q} className="card-base p-6">
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Try the adaptive approach free</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
            20 adaptive questions/day, no card. See whether you prefer questions that adapt to your gaps over a fixed bank.
          </p>
          <Link href="/signup?ref=tutorials-dojo-alt" className="btn-primary px-8 py-3 rounded-xl font-semibold inline-block">
            Start free — first question in 90 seconds →
          </Link>
          <p className="text-zinc-600 text-xs mt-3">
            Not affiliated with Tutorials Dojo or Jon Bonso. Fair comparison — we named our cons too.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold gradient-text">Maestring</Link>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/pricing" className="hover:text-zinc-300">Pricing</Link>
            <Link href="/alternatives/stephane-maarek" className="hover:text-zinc-300">vs Maarek</Link>
            <Link href="/alternatives/aws-skill-builder" className="hover:text-zinc-300">vs Skill Builder</Link>
            <Link href="/legal/privacy" className="hover:text-zinc-300">Privacy</Link>
          </div>
          <p className="text-zinc-700 text-xs">© {new Date().getFullYear()} Maestring</p>
        </div>
      </footer>
    </div>
  );
}
