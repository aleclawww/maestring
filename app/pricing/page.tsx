import Link from "next/link";
import type { Metadata } from "next";
import { UpgradeButton } from "@/components/billing/UpgradeButton";

export const metadata: Metadata = {
  title: "Pricing — Maestring",
  description: "Simple, transparent pricing for AWS certification prep.",
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
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">Simple, honest pricing</h1>
        <p className="text-zinc-400 mb-16 max-w-lg mx-auto">
          No upsells. No hidden limits. Upgrade when you're ready.
        </p>
        <div className="grid md:grid-cols-2 gap-6 text-left">
          <div className="card-base p-8">
            <div className="text-lg font-semibold mb-1">Free</div>
            <div className="text-4xl font-black mb-2">$0</div>
            <div className="text-zinc-500 text-sm mb-6">Forever free</div>
            <ul className="space-y-3 text-zinc-400 text-sm mb-8">
              {["20 AI-generated questions/day", "Knowledge graph (43 concepts)", "Basic progress tracking", "5-question exam preview", "Email support"].map((f) => (
                <li key={f} className="flex gap-2"><span className="text-emerald-400">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/signup" className="btn-outline w-full text-center py-3 rounded-lg block">Start for free</Link>
          </div>
          <div className="card-base p-8 border-indigo-500/40 relative">
            <div className="absolute -top-3 right-6 bg-indigo-500 text-white text-xs px-3 py-1 rounded-full font-semibold">BEST VALUE</div>
            <div className="text-lg font-semibold mb-1">Pro</div>
            <div className="text-4xl font-black mb-2">$19</div>
            <div className="text-zinc-500 text-sm mb-6">per month · cancel anytime</div>
            <ul className="space-y-3 text-zinc-400 text-sm mb-8">
              {[
                "Everything in Free",
                "Unlimited AI-generated questions",
                "PDF upload & question generation",
                "Full 65-question exam simulator",
                "Advanced domain analytics",
                "Daily streak email reminders",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex gap-2"><span className="text-emerald-400">✓</span>{f}</li>
              ))}
            </ul>
            <UpgradeButton
              plan="monthly"
              className="btn-primary w-full text-center py-3 rounded-lg block"
            >
              Start 7-day free trial
            </UpgradeButton>
          </div>
        </div>
        <p className="text-zinc-600 text-sm mt-8">
          Payments processed securely by Stripe. By subscribing you agree to our{" "}
          <Link href="/legal/terms" className="text-indigo-400 hover:underline">Terms of Service</Link> and <Link href="/legal/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
