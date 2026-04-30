"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";

type Props = {
  plan?: "monthly" | "annual";
  className?: string;
  children: React.ReactNode;
  /** If true, redirect unauth users to /signup?plan=pro instead of failing */
  redirectIfUnauth?: boolean;
};

export function UpgradeButton({
  plan = "monthly",
  className,
  children,
  redirectIfUnauth = true,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    track({ name: "checkout_started", properties: { plan } });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401 && redirectIfUnauth) {
        router.push(`/signup?plan=pro`);
        return;
      }

      // Previously: `await res.json()` was unguarded. A non-JSON response —
      // Vercel edge HTML during a deploy cutover, a Cloudflare 502 page, a
      // proxy-mangled body — threw inside the .json() call and fell into the
      // bare `catch {}` below, which set "Network error" even though the
      // network was fine. The actual signal (revenue-critical checkout is
      // broken) never reached ops, and the user was told to check their
      // connection while the real issue was server-side. Also, the bare
      // catch threw away the error object so Sentry/console never saw
      // anything. This is the literal pay page — worth being precise.
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.url) {
        console.error("UpgradeButton checkout failed", {
          status: res.status,
          body: data,
          plan,
        });
        setError(
          data.message ??
            data.error ??
            `Could not start checkout (HTTP ${res.status}). Please try again.`
        );
        setLoading(false);
        return;
      }

      // Validate the redirect URL is a legitimate Stripe-hosted page before
      // following it. The URL comes from our own API, but a defence-in-depth
      // check ensures a compromised server response can't redirect the user to
      // an arbitrary phishing domain.
      const ALLOWED_STRIPE_HOSTS = ['checkout.stripe.com', 'billing.stripe.com']
      let parsedUrl: URL
      try {
        parsedUrl = new URL(data.url)
      } catch {
        console.error("UpgradeButton: checkout URL is not a valid URL", { url: data.url })
        setError("Unexpected checkout response. Please try again.")
        setLoading(false)
        return
      }
      if (parsedUrl.protocol !== 'https:' || !ALLOWED_STRIPE_HOSTS.includes(parsedUrl.hostname)) {
        console.error("UpgradeButton: checkout URL failed origin check", { url: data.url })
        setError("Unexpected checkout response. Please try again.")
        setLoading(false)
        return
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("UpgradeButton checkout network error", { err, plan });
      setError("Network error while starting checkout. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Redirecting…" : children}
      </button>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger text-center"
        >
          {error}
        </div>
      )}
    </div>
  );
}
