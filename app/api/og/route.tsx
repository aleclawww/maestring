import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// ?title=  — main heading (default: product tagline)
// ?sub=    — subline (default: empty)
// ?badge=  — top badge text (default: empty)
// ?score=  — readiness score 0-100 (default: hidden)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "Stop memorizing 1,000 questions.\nKnow when you're ready.";
  const sub = searchParams.get("sub") ?? "AWS SAA-C03 adaptive prep · FSRS spaced repetition · Readiness Score";
  const badge = searchParams.get("badge") ?? "";
  const scoreRaw = searchParams.get("score");
  const score = scoreRaw != null ? parseInt(scoreRaw, 10) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          backgroundColor: "#0f1117",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            opacity: 0.3,
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Top row: logo + badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              🎓
            </div>
            <span style={{ color: "#ffffff", fontSize: "22px", fontWeight: 700 }}>Maestring</span>
          </div>
          {badge && (
            <div
              style={{
                backgroundColor: "#1a1a2e",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                padding: "6px 16px",
                color: "#6366f1",
                fontSize: "13px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {badge}
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative", flex: 1, justifyContent: "center" }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: title.length > 50 ? "46px" : "52px",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              whiteSpace: "pre-line",
              maxWidth: score != null ? "740px" : "900px",
            }}
          >
            {title}
          </div>
          {sub && (
            <div style={{ color: "#71717a", fontSize: "22px", lineHeight: 1.5 }}>
              {sub}
            </div>
          )}
        </div>

        {/* Score card (optional) */}
        {score != null && (
          <div
            style={{
              position: "absolute",
              right: "64px",
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "#1a1a2e",
              border: "2px solid #6366f1",
              borderRadius: "20px",
              padding: "32px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              minWidth: "200px",
            }}
          >
            <div style={{ color: "#71717a", fontSize: "14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Readiness
            </div>
            <div
              style={{
                color: score >= 80 ? "#34d399" : score >= 65 ? "#f59e0b" : "#f87171",
                fontSize: "72px",
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {score}
            </div>
            <div style={{ color: "#52525b", fontSize: "14px" }}>/ 100</div>
            <div
              style={{
                marginTop: "8px",
                backgroundColor: score >= 80 ? "#065f46" : score >= 65 ? "#78350f" : "#7f1d1d",
                borderRadius: "6px",
                padding: "4px 12px",
                color: score >= 80 ? "#34d399" : score >= 65 ? "#f59e0b" : "#f87171",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {score >= 80 ? "Pass zone ✓" : score >= 65 ? "On track" : "Keep going"}
            </div>
          </div>
        )}

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            borderTop: "1px solid #27272a",
            paddingTop: "24px",
          }}
        >
          <div style={{ color: "#52525b", fontSize: "16px" }}>maestring.com</div>
          <div style={{ display: "flex", gap: "24px" }}>
            {["FSRS-4.5 Algorithm", "AI Adaptive Questions", "Readiness Score"].map((feat) => (
              <div
                key={feat}
                style={{
                  backgroundColor: "#27272a",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  color: "#a1a1aa",
                  fontSize: "14px",
                }}
              >
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
