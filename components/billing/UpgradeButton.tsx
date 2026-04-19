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

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Redirecting…" : children}
      </button>
      {error && (
        <p className="text-xs text-red-400 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
