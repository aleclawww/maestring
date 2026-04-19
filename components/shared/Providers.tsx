"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

// ─── PostHog ─────────────────────────────────────────────────────────────────

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    capture_pageview: false, // Manejar manualmente con Next.js router
    persistence: "localStorage+cookie",
    autocapture: false, // Controlar qué capturamos
  });
}

// ─── Provider principal ───────────────────────────────────────────────────────

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PostHogProvider client={posthog}>
      {children}
    </PostHogProvider>
  );
}
