"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const AUTH_PREFIXES = ["/dashboard", "/study", "/settings", "/documents", "/referrals", "/onboarding", "/admin", "/progress", "/exam", "/login", "/signup"];

export function StickySignupBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (AUTH_PREFIXES.some((p) => path.startsWith(p))) return;

    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden">
      <div className="bg-surface border-t border-border px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">Start free — 7 days of Pro</p>
          <p className="text-xs text-text-muted">No card required</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/signup"
            className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg whitespace-nowrap"
          >
            Get started →
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-text-muted p-1"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
