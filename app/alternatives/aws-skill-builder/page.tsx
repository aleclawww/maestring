import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AWS Skill Builder Alternatives for SAA-C03 Exam Prep (2024)",
  description:
    "AWS Skill Builder is great for official labs but can't tell you your pass probability. See the best alternatives for adaptive exam prep and readiness measurement.",
  alternates: { canonical: 'https://maestring.com/alternatives/aws-skill-builder' },
  openGraph: {
    title: "AWS Skill Builder Alternatives for SAA-C03 Prep",
    description: "AWS Skill Builder is great for official labs but can't tell you your pass probability. See the best alternatives.",
    url: 'https://maestring.com/alternatives/aws-skill-builder',
    images: [{
      url: 'https://maestring.com/api/og?title=AWS+Skill+Builder+Alternatives&sub=AWS+SAA-C03+%C2%B7+Adaptive+AI+vs+Official+Labs&badge=vs+Skill+Builder',
      width: 1200,
      height: 630,
    }],
  },
};

export default function SkillBuilderAlternativesPage() {
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
          <span>Alternatives to AWS Skill Builder</span>
        </nav>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Best AWS Skill Builder Alternatives
          <br />
          <span className="gradient-text">for SAA-C03 Prep (2024)</span>
        </h1>

        <p className="text-xl text-zinc-400 mb-6 leading-relaxed">
          AWS Skill Builder is the official AWS learning platform — authoritative, lab-rich, and updated by the people who write the exams. But at $29/mo it gives you the same static 20-question practice exam as everyone else, with no adaptive scheduling and no readiness prediction.
        </p>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 mb-12 text-sm">
          <strong className="text-indigo-300">Bottom line:</strong>{" "}
          <span className="text-zinc-300">
            Keep Skill Builder for its official labs — they&rsquo;re irreplaceable. Replace its practice exam layer with Maestring (adaptive AI + readiness score) and Tutorials Dojo (high-quality static exams).
          </span>
        </div>

        <div className="space-y-6 mb-16">
          {[
            {
              name: "Maestring",
              badge: "Best for readiness prediction",
              highlight: true,
              price: "Free / $19/mo",
              desc: "Adaptive AI questions targeting your weak SAA-C03 domains. FSRS-4.5 spaced repetition. Live Readiness Score 0–100. The thing Skill Builder's static exam can't do: tell you your pass probability.",
              cta: "/signup?ref=sb-alt",
            },
            {
              name: "Tutorials Dojo (Jon Bonso)",
              badge: null,
              highlight: false,
              price: "$20 lifetime",
              desc: "1,500+ high-quality practice questions with detailed AWS docs references. Excellent final-week checkpoint. Static, but quality-validated.",
              cta: null,
            },
            {
              name: "Stephane Maarek (Udemy)",
              badge: null,
              highlight: false,
              price: "$15 (Udemy sale)",
              desc: "Comprehensive video coverage of all SAA-C03 domains. Better for theory foundation than Skill Builder's lab-heavy format. Cheaper.",
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
          <h2 className="text-2xl font-bold mb-3">Try Maestring free alongside Skill Builder</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
            Keep your Skill Builder labs. Add Maestring for adaptive practice and a Readiness Score that tells you when to book the exam.
          </p>
          <Link href="/signup?ref=sb-alt" className="btn-primary px-8 py-3 rounded-xl font-semibold inline-block">
            Start free — no card required →
          </Link>
          <p className="text-zinc-600 text-xs mt-3">Not affiliated with Amazon Web Services, Inc.</p>
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
