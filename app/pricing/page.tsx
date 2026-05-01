import Link from "next/link";
import type { Metadata } from "next";
import { UpgradeButton } from "@/components/billing/UpgradeButton";

export const metadata: Metadata = {
  title: "Pricing — Maestring",
  description:
    "Pay $19/month. Pass once. Free 7-day trial, no credit card. Less than the cost of a failed AWS SAA-C03 exam attempt.",
  alternates: { canonical: 'https://maestring.com/pricing' },
  openGraph: {
    title: "Maestring Pricing — $19/mo for unlimited adaptive AWS SAA-C03 prep",
    description: "Free forever tier + Pro at $19/mo. 7-day trial, no card. Most engineers pass in 2 billing cycles — less than a Tutorials Dojo + Maarek bundle.",
    url: 'https://maestring.com/pricing',
    type: 'website',
  },
};

const pricingFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Why $19/month and not a lifetime price like Tutorials Dojo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AWS reissues SAA-C03 objectives roughly every 18 months and we rewrite the question generator each time. A lifetime price means stale prep two years from now. $19/mo means the prep always matches the current exam.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens after the 7-day free trial?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your card is charged $19 for the first month. If you don\'t add a card, you automatically drop to the Free tier — 20 AI questions/day, no exam simulator, no PDF uploads.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a pass-or-refund guarantee?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. If your Readiness Score reaches 80+ and you still fail the exam, we refund your last month, no questions asked. We won\'t make a "100% pass guarantee" — that\'s not honest. We will tell you every day what your pass probability is.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel anytime?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Cancel from Settings → Billing. No dark patterns, no exit survey required (though we appreciate the feedback). Access continues until the end of your billing period.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you offer team or enterprise pricing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — email hello@maestring.com with your team size. We work with consultancies and companies that need to certify multiple engineers, with consolidated billing and progress dashboards.',
      },
    },
  ],
};

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Maestring Pro',
  description:
    'Unlimited adaptive AI questions, FSRS-4.5 spaced repetition, PDF RAG, Live Readiness Score, and 65-question exam simulator for AWS SAA-C03.',
  brand: { '@type': 'Brand', name: 'Maestring' },
  url: 'https://maestring.com/pricing',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: '20 AI questions/day, knowledge graph, basic tracking.',
    },
    {
      '@type': 'Offer',
      name: 'Pro Monthly',
      price: '19',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '19',
        priceCurrency: 'USD',
        unitCode: 'MON',
      },
      description: 'Unlimited questions, full FSRS, RAG over PDFs, Readiness Score, exam simulator.',
    },
  ],
};

const FREE_FEATURES = [
  "20 AI-generated questions/day",
  "Knowledge graph (43 SAA concepts)",
  "Basic progress tracking",
  "5-question exam preview",
  "Email support",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited adaptive AI questions",
  "PDF upload & RAG-backed questions",
  "Full 65-question exam simulator",
  "Live Readiness Score 0–100",
  "Advanced domain analytics",
  "Daily streak email reminders",
  "Pass-or-refund guarantee",
  "Priority support",
];

const OBJECTIONS = [
  {
    q: "I already paid for Tutorials Dojo.",
    a: "Good — upload the TD cheatsheet PDF to Maestring. We'll generate questions anchored to the exact sections you keep missing. TD becomes your source-of-truth; Maestring tells you what to re-read and when. They complement each other.",
  },
  {
    q: "Why monthly and not a lifetime price like TD?",
    a: "AWS reissues SAA-C03 objectives roughly every 18 months and we rewrite the question generator each time. A $20 lifetime price means stale prep in 2027. $19/mo means the prep always matches the current exam blueprint.",
  },
  {
    q: "What if I don't pass?",
    a: "We won't promise you'll pass — that's a legal claim we won't make. We will tell you your pass probability every day. If your Readiness Score hits 80+ and you still fail, we refund your last month. No email back-and-forth.",
  },
  {
    q: "Is the AI accurate? Can it hallucinate wrong answers?",
    a: "Every generated question is grounded against the SAA-C03 blueprint and (when you upload PDFs) your source material via pgvector retrieval. Claude Haiku's explanations include the exact reasoning. No question ships without a correct-answer citation. If you spot an error, report it — we refund the session.",
  },
];

const PRICING_FAQS = [
  {
    q: "What happens after the 7-day trial?",
    a: "Your card is charged $19 for the first month. If you don't add a card, you automatically drop to the Free tier — 20 AI questions/day, no exam simulator, no PDF uploads.",
  },
  {
    q: "Is there a student or team discount?",
    a: "Email hello@maestring.com. We work with consultancies and companies certifying multiple engineers — consolidated billing and team dashboards available.",
  },
  {
    q: "How long does it take to pass SAA-C03 with Maestring?",
    a: "Most engineers hit Readiness Score 80+ in 4–8 weeks with daily 20–30 min sessions. The Readiness Score tells you exactly when you're ready — no guessing.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No dark patterns. Cancel from Settings → Billing. Access continues until the end of your billing period.",
  },
  {
    q: "Do you offer team pricing?",
    a: "Yes — email hello@maestring.com with your team size and we'll set up consolidated billing with a progress dashboard.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#0f1117]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">Maestring</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">Sign in</Link>
            <Link href="/signup" className="btn-primary text-sm px-4 py-2 rounded-lg">Start free</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Pay $19 a month.
            <br />
            <span className="gradient-text">Pass once.</span>
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Free to try for 7 days, no card. Most engineers pass within 2 billing cycles — costing less than a Stephane Maarek course plus a Tutorials Dojo bundle, and replacing both.
          </p>
          <p className="text-zinc-600 text-sm mt-3">
            The AWS SAA-C03 exam costs $150 per attempt. Do the math.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="card-base p-8">
            <div className="text-lg font-semibold mb-1">Free</div>
            <div className="text-4xl font-black mb-1">$0</div>
            <div className="text-zinc-500 text-sm mb-6">Forever free · No card needed</div>
            <ul className="space-y-3 text-zinc-400 text-sm mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-outline w-full text-center py-3 rounded-lg block">
              Start free — no card
            </Link>
          </div>

          <div className="card-base p-8 border-indigo-500/40 relative">
            <div className="absolute -top-3 right-6 bg-indigo-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
              MOST ENGINEERS PICK THIS
            </div>
            <div className="text-lg font-semibold mb-1">Pro</div>
            <div className="text-4xl font-black mb-1">$19<span className="text-lg text-zinc-400 font-normal">/mo</span></div>
            <div className="text-zinc-500 text-sm mb-6">7-day free trial · Cancel anytime</div>
            <ul className="space-y-3 text-zinc-400 text-sm mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <UpgradeButton
              plan="monthly"
              surface="pricing_page"
              className="btn-primary w-full text-center py-3 rounded-lg block"
            >
              Start 7-day free trial →
            </UpgradeButton>
            <p className="text-zinc-600 text-xs text-center mt-3">No card during trial. $19/mo after.</p>
          </div>
        </div>

        {/* Annual plan banner */}
        <div className="card-base p-6 mb-6 border-indigo-500/20 bg-indigo-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Save 17%</div>
              <div className="text-white font-semibold">Annual plan — $190/yr</div>
              <p className="text-zinc-400 text-sm mt-1">
                Two months free. Most engineers who choose annual are targeting SAP-C02 after SAA.
                Lock in the rate, pass once, upgrade next.
              </p>
            </div>
            <div className="flex-shrink-0">
              <UpgradeButton
                plan="annual"
                surface="pricing_annual_banner"
                className="btn-outline text-sm px-6 py-2.5 rounded-lg whitespace-nowrap"
              >
                Get annual ($190/yr) →
              </UpgradeButton>
            </div>
          </div>
        </div>

        {/* Team CTA */}
        <div className="card-base p-6 mb-16 text-center border-zinc-700/50">
          <div className="text-sm text-zinc-300 font-semibold mb-1">Team pricing available</div>
          <p className="text-zinc-500 text-sm mb-4">
            Certifying your whole team at a consultancy? We offer consolidated billing, shared dashboards, and per-seat pricing for 3+ seats.
          </p>
          <a href="mailto:hello@maestring.com" className="btn-outline px-6 py-2 rounded-lg text-sm inline-block">
            Contact us for Team pricing →
          </a>
        </div>

        {/* Objection handlers */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {OBJECTIONS.map((o) => (
              <div key={o.q} className="card-base p-6">
                <h3 className="font-semibold text-zinc-200 mb-2">&ldquo;{o.q}&rdquo;</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{o.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">More questions</h2>
          <div className="space-y-4">
            {PRICING_FAQS.map((faq) => (
              <div key={faq.q} className="card-base p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center border-t border-white/5 pt-12">
          <h2 className="text-2xl font-bold mb-3">Still not sure?</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            The free tier has 20 questions/day. Start there. You&rsquo;ll know whether it&rsquo;s worth $19 within the first two sessions.
          </p>
          <Link href="/signup" className="btn-primary px-8 py-3 rounded-xl font-semibold inline-block">
            Start free — first question in 90 seconds
          </Link>
          <p className="text-zinc-600 text-xs mt-3">
            Payments processed by Stripe. By subscribing you agree to our{" "}
            <Link href="/legal/terms" className="text-indigo-400 hover:underline">Terms</Link>
            {" "}and{" "}
            <Link href="/legal/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
