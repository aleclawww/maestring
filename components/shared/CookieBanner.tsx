"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "maestring_cookie_consent_v1";

type Consent = "accepted" | "rejected";

export function readCookieConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readCookieConsent() === null) setVisible(true);
  }, []);

  function decide(value: Consent) {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent("maestring:consent", { detail: value }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#11131c]/95 backdrop-blur-xl p-4 shadow-2xl sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm"
    >
      <p className="text-sm text-zinc-200 mb-3">
        We use necessary cookies to make the app work, and optional analytics
        (PostHog) to understand how the product is used and improve it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => decide("accepted")}
          className="btn-primary text-xs px-3 py-2 rounded-lg"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => decide("rejected")}
          className="btn-outline text-xs px-3 py-2 rounded-lg"
        >
          Necessary only
        </button>
        <Link
          href="/legal/privacy"
          className="text-xs text-zinc-500 hover:text-zinc-300 ml-auto"
        >
          Learn more
        </Link>
      </div>
    </div>
  );
}
