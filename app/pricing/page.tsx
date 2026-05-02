import Link from "next/link";
import type { Metadata } from "next";
import { UpgradeButton } from "@/components/billing/UpgradeButton";

export const metadata: Metadata = {
  title: "Pricing — Maestring",
  description: "Simple, transparent pricing for AWS SAA-C03 certification prep. The full 9-phase Coach is free; Pro adds PDF upload and priority support.",
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: "Pricing — Maestring",
    description: "Free plan ships the full 142-concept syllabus, 9-phase Coach, FSRS spaced repetition, and 65-question mock exam. Pro adds PDF upload and pass-or-refund guarantee.",
    url: '/pricing',
    type: 'website',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#0f1117]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">Maestring</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">Sign in</Link>
            <Link href="/signup" className="btn-primary text-sm px-4 py-2 rounded-lg">Get started free</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-24">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">One plan, no tricks</h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Try the full product free for 7 days. Cancel before day 8 and pay $0.
          </p>
        </div>
        <div className="card-base p-8 border-indigo-500/40 relative">
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
          <UpgradeButton
            plan="monthly"
            className="btn-primary w-full text-center py-3 rounded-lg block"
          >
            Start 7-day free trial →
          </UpgradeButton>
          <p className="text-[11px] text-zinc-500 mt-3 text-center leading-relaxed">
            Card on file required · $0 today · Reminder email 3 days before the first charge ·
            Cancel any time from Settings → Billing · No charge if you cancel within 7 days
          </p>
        </div>
        <p className="text-zinc-600 text-sm mt-8 text-center">
          Payments processed securely by Stripe. By subscribing you agree to our{" "}
          <Link href="/legal/terms" className="text-indigo-400 hover:underline">Terms of Service</Link> and <Link href="/legal/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
