import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Stephane Maarek Alternatives for AWS SAA-C03 (2024)",
  description:
    "Stephane Maarek's Udemy course is excellent for AWS theory but passive. See the best alternatives for active exam prep, spaced repetition, and readiness measurement.",
  alternates: { canonical: 'https://maestring.com/alternatives/stephane-maarek' },
  openGraph: {
    title: "Best Stephane Maarek Alternatives for AWS SAA-C03",
    description: "Maarek is great for learning AWS. For adaptive exam prep and knowing your pass probability, here are better options.",
    url: 'https://maestring.com/alternatives/stephane-maarek',
    images: [{
      url: 'https://maestring.com/api/og?title=Best+Stephane+Maarek+Alternatives&sub=AWS+SAA-C03+%C2%B7+Active+Recall+vs+Passive+Video&badge=vs+Maarek',
      width: 1200,
      height: 630,
    }],
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://maestring.com' },
    { '@type': 'ListItem', position: 2, name: 'Alternatives', item: 'https://maestring.com/alternatives' },
    { '@type': 'ListItem', position: 3, name: 'Stephane Maarek', item: 'https://maestring.com/alternatives/stephane-maarek' },
  ],
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is the Stephane Maarek SAA-C03 course worth it?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — as a theory foundation. Maarek\'s course is comprehensive, updated, and well-structured. Its limitation is passive learning: 30+ hours of video produces low retention without active testing and spaced repetition. Most engineers who pass SAA-C03 combine Maarek\'s content with active practice tools.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best active practice alternative to Stephane Maarek?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Maestring for adaptive AI-generated questions and a live Readiness Score. Tutorials Dojo for high-quality static practice exams. Both complement Maarek\'s theory content rather than replacing it.',
      },
    },
  ],
};

const COMPARISON_ROWS = [
  ["Adaptive question generation", "✓", "–", "✓", "–"],
  ["Video theory content", "–", "✓", "–", "✓"],
  ["FSRS spaced repetition", "✓", "–", "–", "–"],
  ["Live Readiness Score", "✓", "–", "–", "–"],
  ["Static practice exams", "–", "✓", "✓", "–"],
  ["Hands-on labs", "–", "–", "–", "✓"],
  ["Updated for SAA-C03 2024", "✓", "✓", "✓", "✓"],
  ["Price", "$0–$19/mo", "$15 once", "$20 once", "$29/mo"],
];

export default function StephaneMaarekAlternativesPage() {
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
        <nav className="text-xs text-zinc-600 mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-400">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/alternatives/tutorials-dojo" className="hover:text-zinc-400">Alternatives</Link>
          <span className="mx-2">›</span>
          <span>Stephane Maarek</span>
        </nav>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Best Stephane Maarek Alternatives
          <br />
          <span className="gradient-text">for AWS SAA-C03 (2024)</span>
        </h1>

        <p className="text-xl text-zinc-400 mb-6 leading-relaxed">
          Stephane Maarek&rsquo;s SAA-C03 Udemy course is one of the best resources for learning AWS architecture concepts. But 30+ hours of video is passive learning — and passive learning produces low exam retention.
        </p>
        <p className="text-zinc-500 mb-4 leading-relaxed">
          The engineers who struggle with SAA-C03 aren&rsquo;t the ones who didn&rsquo;t watch the videos. They&rsquo;re the ones who watched everything and still scored 65% on practice exams because they never <em>actively retrieved</em> the material under time pressure.
        </p>
        <p className="text-zinc-500 mb-12 leading-relaxed">
          This guide covers tools that complement or replace Maarek for the active practice layer: Maestring (adaptive AI), Tutorials Dojo (static exams), and AWS Skill Builder (official labs).
        </p>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 mb-14 text-sm">
          <strong className="text-indigo-300">TL;DR:</strong>{" "}
          <span className="text-zinc-300">
            Keep Maarek for theory. Add Maestring for adaptive practice and readiness tracking. Add Tutorials Dojo for a final-week checkpoint. Total cost: ~$34 + $19/mo. Likely still cheaper than one failed exam attempt.
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
                <th className="py-3 px-3 text-zinc-400 font-normal text-center">Maarek (Udemy)</th>
                <th className="py-3 px-3 text-zinc-400 font-normal text-center">Tutorials Dojo</th>
                <th className="py-3 px-3 text-zinc-400 font-normal text-center">Skill Builder</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map(([feature, maestring, maarek, td, sb]) => (
                <tr key={feature as string} className="border-b border-white/5">
                  <td className="py-3 px-3 text-zinc-300">{feature}</td>
                  {[maestring, maarek, td, sb].map((v, i) => (
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

        {/* Alternatives */}
        <h2 className="text-2xl font-bold mb-8">The tools that replace the active practice layer</h2>
        <div className="space-y-6 mb-16">
          {[
            {
              name: "Maestring",
              badge: "OUR PICK — active practice + readiness",
              highlight: true,
              price: "Free / $19/mo",
              what: "Generates fresh adaptive questions targeting your weak SAA-C03 domains every session. FSRS-4.5 schedules reviews at optimal intervals. Live Readiness Score 0–100 tells you when to book the exam.",
              vs_maarek: "Where Maarek teaches you the concepts, Maestring tests whether you've retained them and predicts your pass probability. Upload Maarek's PDF notes as source material for RAG-backed question generation.",
              cta_href: "/signup?ref=maarek-alt",
            },
            {
              name: "Tutorials Dojo (Jon Bonso)",
              badge: null,
              highlight: false,
              price: "$20 lifetime",
              what: "1,500+ high-quality, exam-realistic SAA-C03 practice questions with excellent explanations. Best static practice exam set available.",
              vs_maarek: "More active than video, but still static — same questions for every user. Best used for a final-week checkpoint after adaptive prep. No spaced repetition or readiness prediction.",
              cta_href: null,
            },
            {
              name: "AWS Skill Builder",
              badge: null,
              highlight: false,
              price: "$29/mo",
              what: "Official AWS content including hands-on labs in real AWS environments. The authoritative source — complements rather than replaces Maarek.",
              vs_maarek: "Both are content/labs tools, not active practice. Best used alongside either Maestring or Tutorials Dojo for exam-readiness measurement.",
              cta_href: null,
            },
          ].map((alt) => (
            <div key={alt.name} className={`card-base p-8 ${alt.highlight ? "border-indigo-500/30" : ""}`}>
              <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold">{alt.name}</h3>
                    {alt.badge && (
                      <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        {alt.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-600 text-sm">{alt.price}</p>
                </div>
                {alt.cta_href && (
                  <Link href={alt.cta_href} className="btn-primary text-sm px-4 py-2 rounded-lg shrink-0">
                    Try free →
                  </Link>
                )}
              </div>
              <p className="text-zinc-400 text-sm mb-3 leading-relaxed">{alt.what}</p>
              <div className="border-t border-white/5 pt-3">
                <p className="text-sm text-zinc-500">
                  <strong className="text-zinc-400">vs Maarek:</strong> {alt.vs_maarek}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Recommended stack */}
        <div className="card-base p-8 border-emerald-500/20 mb-16">
          <h2 className="text-xl font-bold mb-4">Recommended prep stack (total: ~$34 + $19/mo)</h2>
          <div className="space-y-3 text-sm">
            {[
              { step: "1", tool: "Stephane Maarek (Udemy)", role: "Theory foundation — watch at 1.5x, take notes as PDF", cost: "$15 on sale" },
              { step: "2", tool: "Maestring Pro", role: "Daily adaptive practice + FSRS scheduling + Readiness Score (upload Maarek PDF notes as RAG source)", cost: "$19/mo, 7-day free trial" },
              { step: "3", tool: "Tutorials Dojo", role: "Final-week checkpoint — full timed practice exams to confirm readiness", cost: "$20 lifetime" },
              { step: "4", tool: "AWS Official Practice Exam", role: "One-time 20-question calibration before booking the real exam", cost: "Free with AWS account" },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="text-indigo-400 font-bold shrink-0 w-6">{s.step}.</div>
                <div>
                  <span className="text-zinc-200 font-semibold">{s.tool}</span>
                  <span className="text-zinc-400"> — {s.role}</span>
                  <span className="text-zinc-600 text-xs ml-2">({s.cost})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Add the active layer for free</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
            Start with 20 adaptive questions/day on the free tier. Upload your Maarek notes as PDF source material. See the difference between passive video and adaptive practice.
          </p>
          <Link href="/signup?ref=maarek-alt" className="btn-primary px-8 py-3 rounded-xl font-semibold inline-block">
            Start free — no card required →
          </Link>
          <p className="text-zinc-600 text-xs mt-3">
            Not affiliated with Stephane Maarek or Udemy.
          </p>
        </div>
      </div>

      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold gradient-text">Maestring</Link>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/pricing" className="hover:text-zinc-300">Pricing</Link>
            <Link href="/alternatives/tutorials-dojo" className="hover:text-zinc-300">vs Tutorials Dojo</Link>
            <Link href="/alternatives/aws-skill-builder" className="hover:text-zinc-300">vs Skill Builder</Link>
            <Link href="/legal/privacy" className="hover:text-zinc-300">Privacy</Link>
          </div>
          <p className="text-zinc-700 text-xs">© {new Date().getFullYear()} Maestring</p>
        </div>
      </footer>
    </div>
  );
}
