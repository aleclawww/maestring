"use client";

import { useState, useCallback } from "react";

type PaywallSurface =
  | "daily_limit"
  | "pdf_upload"
  | "rag"
  | "readiness_score"
  | "exam_simulator"
  | "full_history";

export function usePaywallModal(defaultSurface: PaywallSurface = "daily_limit") {
  const [isOpen, setIsOpen] = useState(false);
  const [surface, setSurface] = useState<PaywallSurface>(defaultSurface);

  const open = useCallback((s?: PaywallSurface) => {
    if (s) setSurface(s);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, surface, open, close };
}
