"use client";

import { useState } from "react";
import { PaywallModal } from "@/components/billing/PaywallModal";

export function FullHistoryPaywallCta() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 text-xs text-primary hover:text-primary/80 transition-colors border-t border-border"
      >
        View full history — unlock with Pro ✦
      </button>
      <PaywallModal isOpen={open} onClose={() => setOpen(false)} surface="full_history" />
    </>
  );
}
