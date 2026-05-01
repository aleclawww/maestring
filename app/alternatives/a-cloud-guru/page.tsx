import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "A Cloud Guru Alternatives for AWS SAA-C03 Prep (2024)",
  description:
    "A Cloud Guru costs $39–49/mo and covers dozens of certs generically. If you just need AWS SAA-C03, here are better-value alternatives.",
  alternates: { canonical: 'https://maestring.com/alternatives/a-cloud-guru' },
  openGraph: {
    title: "A Cloud Guru Alternatives for AWS SAA-C03 (2024)",
    description: "A Cloud Guru covers 50+ certs at $39/mo. If you only need AWS SAA-C03, here are sharper, cheaper alternatives.",
    url: 'https://maestring.com/alternatives/a-cloud-guru',
    images: [{
      url: 'https://maestring.com/api/og?title=A+Cloud+Guru+Alternatives&sub=AWS+SAA-C03+%C2%B7+Focused+Prep+vs+Broad+Catalog&badge=vs+A+Cloud+Guru',
      width: 1200,
      height: 630,
    }],
  },
};

export default function ACloudGuruAlternativesPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#0f1117]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">Maestring</Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-zinc-400 hover:text-white text-sm transition-colors">Pricing</Link>
            <Link href="/signup" className="btn-primary text-sm px-4 py-2 rounded-lg">Start free</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="text-xs text-zinc-600 mb-8">
          <Link href="/" className="hover:text-zinc-400">Home</Link>
          <span className="mx-2">›</span>
          <span>Alternatives to A Cloud Guru</span>
        </nav>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Best A Cloud Guru Alternatives
          <br />
          <span className="gradient-text">for AWS SAA-C03 (2024)</span>
        </h1>

        <p className="text-xl text-zinc-400 mb-6 leading-relaxed">
          A Cloud Guru (now part of Pluralsight) charges $39–49/mo for a broad multi-cloud catalog. If your goal is AWS SAA-C03 specifically — not 200 certifications across 4 clouds — you&rsquo;re paying for content you won&rsquo;t use.
        </p>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 mb-12 text-sm">
          <strong className="text-indigo-300">Bottom line:</strong>{" "}
          <span className="text-zinc-300">
            For SAA-C03 specifically: Maestring ($19/mo adaptive) + Maarek ($15 once) + Tutorials Dojo ($20 once) = ~$54 total and more targeted than ACG at $39–49/mo ongoing.
          </span>
        </div>

        <div className="space-y-6 mb-16">
          {[
            {
              name: "Maestring",
              badge: "Best for SAA-C03 specifically",
              highlight: true,
              price: "Free / $19/mo",
              desc: "Purpose-built for AWS SAA-C03. Adaptive AI questions, FSRS-4.5 spaced repetition, Live Readiness Score. No multi-cloud bloat — just SAA-C03 mastery.",
              cta: "/signup?ref=acg-alt",
            },
            {
              name: "Stephane Maarek (Udemy)",
              badge: null,
              highlight: false,
              price: "$15 (Udemy sale)",
              desc: "Best SAA-C03 video course, purpose-built for the exam. No filler content from 200 other certifications. $15 once vs $39–49/mo.",
              cta: null,
            },
            {
              name: "Tutorials Dojo",
              badge: null,
              highlight: false,
              price: "$20 lifetime",
              desc: "1,500+ SAA-C03-specific practice questions, $20 once. More targeted and cheaper than ACG's practice exam module.",
              cta: null,
            },
            {
              name: "AWS Skill Builder",
              badge: null,
              highlight: false,
              price: "$29/mo",
              desc: "Official AWS labs and content. Only worth it if you need the hands-on lab environment — otherwise Maarek covers the theory more efficiently.",
              cta: null,
            },
          ].map((alt) => (
            <div key={alt.name} className={`card-base p-8 ${alt.highlight ? "border-indigo-500/30" : ""}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{alt.name}</h2>
                  {alt.badge && (
                    <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">{alt.badge}</span>
                  )}
                </div>
                <span className="text-zinc-500 text-sm">{alt.price}</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{alt.desc}</p>
              {alt.cta && (
                <Link href={alt.cta} className="btn-primary text-sm px-6 py-2 rounded-lg inline-block">
                  Try free →
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Purpose-built for SAA-C03</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
            No multi-cloud filler. No content for certs you&rsquo;re not studying. Just adaptive SAA-C03 prep that tells you when you&rsquo;re ready to book the exam.
          </p>
          <Link href="/signup?ref=acg-alt" className="btn-primary px-8 py-3 rounded-xl font-semibold inline-block">
            Start free — first question in 90 seconds →
          </Link>
          <p className="text-zinc-600 text-xs mt-3">Not affiliated with A Cloud Guru or Pluralsight.</p>
        </div>
      </div>

      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold gradient-text">Maestring</Link>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/pricing" className="hover:text-zinc-300">Pricing</Link>
            <Link href="/alternatives/tutorials-dojo" className="hover:text-zinc-300">vs Tutorials Dojo</Link>
            <Link href="/alternatives/stephane-maarek" className="hover:text-zinc-300">vs Maarek</Link>
            <Link href="/legal/privacy" className="hover:text-zinc-300">Privacy</Link>
          </div>
          <p className="text-zinc-700 text-xs">© {new Date().getFullYear()} Maestring</p>
        </div>
      </footer>
    </div>
  );
}
