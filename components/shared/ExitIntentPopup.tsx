"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

const STORAGE_KEY = "maestring_exit_dismissed";
const DISMISS_DAYS = 7;

// Never fire on authenticated app pages.
const AUTH_PREFIXES = ["/dashboard", "/study", "/settings", "/documents", "/referrals", "/onboarding", "/admin", "/progress", "/exam"];

function isAuthPage(): boolean {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  return AUTH_PREFIXES.some((p) => path.startsWith(p));
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    // Only fire once per session, not on app pages, and not if dismissed within the last 7 days.
    if (firedRef.current || isAuthPage() || wasDismissedRecently()) return;

    function handleMouseOut(e: MouseEvent) {
      // Exit intent: mouse leaves through the top of the viewport.
      if (e.clientY > 20) return;
      if (firedRef.current) return;
      firedRef.current = true;
      setVisible(true);
      track({ name: "paywall_viewed", properties: { surface: "exit_intent" } });
    }

    // Small delay so the popup doesn't fire immediately on page load
    // if the user scrolls to the top on a mobile-emulated device.
    const timeout = setTimeout(() => {
      document.addEventListener("mouseout", handleMouseOut);
    }, 4000);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  function dismiss() {
    markDismissed();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Before you go"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        <div className="p-8">
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-2"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Headline */}
          <div className="text-3xl mb-4">⏱️</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Before you go — one number.
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            The AWS SAA-C03 exam costs <strong className="text-text-primary">$150 per attempt</strong>.
            Most engineers who fail say they &ldquo;felt ready&rdquo; going in.
          </p>

          {/* Value prop */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6 space-y-2">
            <p className="text-sm text-text-secondary">
              Maestring gives you a <strong className="text-text-primary">Readiness Score (0–100)</strong> computed from
              your actual recall across every SAA-C03 objective — weighted by domain and recency.
            </p>
            <p className="text-sm text-text-secondary">
              When it reads <strong className="text-text-primary">82+</strong>, book the exam.
              When it&rsquo;s below 70, don&rsquo;t spend the $150.
            </p>
          </div>

          {/* CTA */}
          <Link
            href="/signup"
            onClick={dismiss}
            className="block w-full text-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl py-3.5 transition-colors text-sm"
          >
            See my Readiness Score — free for 7 days →
          </Link>

          <p className="text-center text-xs text-text-muted mt-3">
            No card required during trial.
          </p>
        </div>
      </div>
    </div>
  );
}
