import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Maestring",
  description: "Terms and conditions for using Maestring.",
};

const LAST_UPDATED = "April 19, 2026";

export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p className="text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>

      <h2>1. Who We Are</h2>
      <p>
        Maestring is a service operated by a sole trader in Spain that provides
        adaptive preparation tools for technical certifications
        (currently AWS Certified Solutions Architect — Associate).
      </p>

      <h2>2. Acceptance</h2>
      <p>
        By creating an account or using the service you accept these terms. If you
        disagree, do not use Maestring.
      </p>

      <h2>3. Account and Eligibility</h2>
      <p>
        You must be at least 16 years old. You are responsible for keeping your
        credentials confidential. Notify us immediately of any unauthorized use at{" "}
        <a href="mailto:support@maestring.com">support@maestring.com</a>.
      </p>

      <h2>4. Plans and Payment</h2>
      <ul>
        <li><strong>Free:</strong> 20 AI questions per day, no charge.</li>
        <li><strong>Pro:</strong> paid monthly subscription, unlimited questions. Cancel any time from Settings.</li>
      </ul>
      <p>
        Payments are processed by Stripe. Maestring does not store card data.
        Any trial period converts to a paid subscription unless cancelled beforehand.
      </p>

      <h2>5. Refunds</h2>
      <p>
        Full refund within <strong>14 days</strong> of the first purchase
        (right of withdrawal, Art. 102 RDL 1/2007).
        Request a refund by email.
      </p>

      <h2>6. Acceptable Use</h2>
      <p>
        The following are not permitted: scraping generated content, reselling access,
        or using the service to train third-party models.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        AI-generated content during your study sessions is for your personal study use.
        Maestring retains rights over the platform, prompts, and knowledge graph.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        Maestring is a study tool. We do not guarantee passing any exam. AI-generated
        questions may contain errors; they do not replace official AWS documentation.
      </p>

      <h2>9. Modifications</h2>
      <p>
        We may update these terms. Material changes are notified by email
        at least 30 days in advance.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        Spanish law applies. Competent courts: those of the consumer's domicile
        when the consumer is an individual resident in the EU.
      </p>

      <h2>11. Contact</h2>
      <p>
        <a href="mailto:support@maestring.com">support@maestring.com</a>
      </p>
    </article>
  );
}
