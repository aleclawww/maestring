import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Maestring",
  description: "How Maestring handles your personal data (GDPR).",
};

const LAST_UPDATED = "April 19, 2026";

export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>

      <h2>1. Data Controller</h2>
      <p>
        Data Controller: Maestring (sole trader, Spain). Contact:{" "}
        <a href="mailto:privacy@maestring.com">privacy@maestring.com</a>.
      </p>

      <h2>2. Data We Process</h2>
      <ul>
        <li><strong>Account:</strong> email, name, avatar (via Google OAuth or magic link).</li>
        <li><strong>Study:</strong> question responses, timings, FSRS metrics, PDFs you upload.</li>
        <li><strong>Payments:</strong> Stripe customer ID (we do not store card data).</li>
        <li><strong>Technical:</strong> IP address, user-agent, error logs (Sentry).</li>
        <li><strong>Analytics (with consent):</strong> product events via PostHog.</li>
      </ul>

      <h2>3. Purposes and Legal Basis</h2>
      <ul>
        <li><strong>Service delivery</strong> (contract performance, Art. 6(1)(b) GDPR).</li>
        <li><strong>Billing</strong> (contract performance).</li>
        <li><strong>Transactional emails</strong> (legitimate interest, Art. 6(1)(f)).</li>
        <li><strong>Product analytics</strong> (consent, Art. 6(1)(a) — cookie banner).</li>
      </ul>

      <h2>4. Sub-processors</h2>
      <ul>
        <li><strong>Supabase</strong> (database hosting, auth) — EU.</li>
        <li><strong>Vercel</strong> (app hosting) — global.</li>
        <li><strong>Stripe</strong> (payments) — Ireland/US (standard contractual clauses).</li>
        <li><strong>Anthropic</strong> and <strong>OpenAI</strong> (AI generation, embeddings) — US. Only anonymous IDs and text from PDFs you upload are sent; no personally identifiable data.</li>
        <li><strong>Resend</strong> (transactional email) — US.</li>
        <li><strong>Sentry</strong> (error tracking) — US.</li>
        <li><strong>PostHog</strong> (analytics, optional) — EU.</li>
        <li><strong>Upstash</strong> (rate limiting) — EU.</li>
      </ul>

      <h2>5. Retention</h2>
      <p>
        Account and study data: retained while your account is active. After cancellation,
        deleted within 30 days unless a legal obligation applies (billing records: 6 years).
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Access, rectification, erasure, objection, restriction, and portability.
        You can <strong>delete your account</strong> directly from{" "}
        <em>Settings → Delete account</em>, or write to{" "}
        <a href="mailto:privacy@maestring.com">privacy@maestring.com</a>.
        Complaints to the supervisory authority: <a href="https://www.aepd.es" target="_blank" rel="noreferrer">aepd.es</a>.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use strictly necessary cookies (session, CSRF). Analytics
        (PostHog) are only activated if you accept the banner. We do not use advertising cookies.
      </p>

      <h2>8. Security</h2>
      <p>
        Encryption in transit (TLS) and at rest (Supabase/Postgres). Row-level security
        per user on all tables. Sentry for incident detection.
      </p>

      <h2>9. Changes</h2>
      <p>
        Material changes are notified by email at least 30 days in advance.
      </p>
    </article>
  );
}
