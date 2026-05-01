"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { track } from "@/lib/analytics";

type PaywallSurface =
  | "daily_limit"
  | "pdf_upload"
  | "rag"
  | "readiness_score"
  | "exam_simulator"
  | "full_history";

type PaywallConfig = {
  heading: string;
  body: string;
  proFeature: string;
};

const SURFACE_COPY: Record<PaywallSurface, PaywallConfig> = {
  daily_limit: {
    heading: "You've hit today's limit",
    body: "Free plan includes 20 questions per day. Pro gives you unlimited questions, full FSRS scheduling, and your Readiness Score — 7 days free, no card needed.",
    proFeature: "Unlimited questions/day",
  },
  pdf_upload: {
    heading: "PDF upload is a Pro feature",
    body: "Upload up to 5 PDFs and every generated question anchors to your source material. Tutorials Dojo cheatsheets, your VPC notes, AWS whitepapers — all of it becomes question fuel.",
    proFeature: "Up to 5 PDFs",
  },
  rag: {
    heading: "Source-anchored questions need Pro",
    body: "Maestring can generate questions anchored to the exact section of your uploaded PDF — but you'll need Pro to upload one. 7 days free, no card required.",
    proFeature: "PDF-anchored questions",
  },
  readiness_score: {
    heading: "Readiness Score needs more data",
    body: "The Readiness Score is a Pro feature. It computes your real recall across SAA-C03 objectives, weighted by FSRS predictions, and tells you whether to book or delay your exam.",
    proFeature: "Live Readiness Score",
  },
  exam_simulator: {
    heading: "Exam Simulator is Pro-only",
    body: "65-question timed mock exams matching the real SAA-C03 format. The Readiness Score updates automatically after each one.",
    proFeature: "Full exam simulator",
  },
  full_history: {
    heading: "Detailed history is Pro-only",
    body: "Free plan shows 7 days of history. Pro gives you the full timeline — every concept, every rating, every FSRS interval — so you can see exactly where you're improving.",
    proFeature: "Full question history",
  },
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  surface: PaywallSurface;
  /** Show annual plan option alongside monthly */
  showAnnual?: boolean;
};

export function PaywallModal({ isOpen, onClose, surface, showAnnual = true }: Props) {
  const copy = SURFACE_COPY[surface];

  // Fire paywall_viewed once when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    track({ name: "paywall_viewed", properties: { surface, plan_shown: "monthly" } });
  }, [isOpen, surface]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col gap-5">
        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-2xl">
          ✨
        </div>

        {/* Heading + body */}
        <div>
          <h2 className="text-lg font-bold text-text-primary">{copy.heading}</h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">{copy.body}</p>
        </div>

        {/* Pro feature callout */}
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
          <svg className="h-4 w-4 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-primary">{copy.proFeature}</span>
        </div>

        {/* Pricing */}
        <div className="flex flex-col gap-2">
          <UpgradeButton
            plan="monthly"
            surface={surface}
            className="btn-primary w-full py-3 text-sm font-semibold"
          >
            Go Pro — $19/mo · 7 days free →
          </UpgradeButton>

          {showAnnual && (
            <UpgradeButton
              plan="annual"
              surface={`${surface}_annual`}
              className="btn-outline w-full py-3 text-sm font-medium"
            >
              Annual — $190/yr · save 2 months
            </UpgradeButton>
          )}
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-text-muted hover:text-text-secondary text-center transition-colors"
        >
          Stay on free plan
        </button>
      </div>
    </Modal>
  );
}
